import { ActorStateSchema } from '@mafia/engine';
import { and, eq, sql } from 'drizzle-orm';
import { Resource } from 'sst';
import { z } from 'zod';
import { afterTx, createTransaction, useTransaction } from '../../db/transaction';
import { InputError, isULID } from '../../error';
import { GameErrors } from '../schema';
import { realtime } from '../../realtime';
import { fn } from '../../util/fn';
import { gamePlayerTable, gameTable } from '../game.sql';
import { appendGameLog } from './log';
import { Realtime } from './events';
import { GameSessionErrors as SessionErrors, VerdictSchema } from './schema';

export const submitVerdict = fn(
	z.object({
		gameId: isULID(),
		voterActorId: z.string(),
		verdict: VerdictSchema,
	}),
	async ({ gameId, voterActorId, verdict }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({ phase: gameTable.phase, actors: gameTable.actors })
				.from(gameTable)
				.where(eq(gameTable.id, gameId));

			if (!game) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			if (game.phase !== 'trial') {
				throw new InputError(
					SessionErrors.NotTrialPhase,
					'Verdicts are only allowed during the trial phase',
				);
			}

			const actors = ActorStateSchema.array().parse(game.actors);
			const voterActor = actors.find((actor) => actor.id === voterActorId);
			if (!voterActor) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
			}

			if (!voterActor.alive) {
				throw new InputError(SessionErrors.PlayerNotAlive, 'Player is not alive');
			}

			const [player] = await tx
				.select({
					id: gamePlayerTable.id,
					number: gamePlayerTable.number,
					onTrial: gamePlayerTable.onTrial,
				})
				.from(gamePlayerTable)
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, voterActorId),
					),
				);

			if (!player) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
			}

			if (player.onTrial) {
				throw new InputError(
					SessionErrors.GameInvalidState,
					'Player on trial cannot submit verdict',
				);
			}

			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ verdict })
				.where(eq(gamePlayerTable.id, player.id))
				.returning({ id: gamePlayerTable.id, number: gamePlayerTable.number });

			if (!updated) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.verdict.submitted',
				phase: 'trial',
				actorId: voterActorId,
				data: { voterActorNumber: updated.number, verdict },
			});

			await afterTx(async () => {
				await realtime.publish(Resource.Realtime, Realtime.Verdict, {
					gameId,
					voterActorNumber: updated.number,
					verdict,
				});
			});

			return { voterActorId, verdict };
		}),
);

/**
 * Clear all verdicts for a game.
 */
export const clearVerdicts = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		createTransaction(async (tx) => {
			await tx
				.update(gamePlayerTable)
				.set({ verdict: null })
				.where(eq(gamePlayerTable.gameId, gameId));

			return { gameId };
		}),
);

/**
 * Tally verdicts and determine the outcome.
 * Returns guilty if guilty > innocent, otherwise innocent (tie goes to innocent).
 */
export const tallyVerdicts = fn(
	z.object({
		gameId: isULID(),
		aliveActorIds: z.array(z.string()),
	}),
	async ({ gameId, aliveActorIds }) =>
		useTransaction(async (tx) => {
			const players = await tx
				.select({
					actorId: gamePlayerTable.actorId,
					verdict: gamePlayerTable.verdict,
					onTrial: gamePlayerTable.onTrial,
				})
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			// Count only guilty/innocent verdicts from alive players who are not on trial.
			// Null (no submission) defaults to abstain.
			const aliveActorIdSet = new Set(aliveActorIds);
			let guiltyCount = 0;
			let abstainCount = 0;
			let innocentCount = 0;

			for (const player of players) {
				// Skip players on trial (they can't vote)
				if (player.onTrial) continue;

				if (!aliveActorIdSet.has(player.actorId)) continue;

				if (player.verdict === 'guilty') {
					guiltyCount++;
				} else if (player.verdict === 'innocent') {
					innocentCount++;
				} else {
					abstainCount++;
				}
			}

			// Guilty wins only if guilty > innocent (tie goes to innocent)
			const isGuilty = guiltyCount > innocentCount;

			return {
				guiltyCount,
				abstainCount,
				innocentCount,
				isGuilty,
				outcome: isGuilty ? ('guilty' as const) : ('innocent' as const),
			};
		}),
);

// ---------------------
// Trial operations
// ---------------------

/**
 * Set a player as on trial.
 */
export const setOnTrial = fn(
	z.object({
		gameId: isULID(),
		actorId: z.string(),
	}),
	async ({ gameId, actorId }) =>
		createTransaction(async (tx) => {
			// First clear any existing on trial status
			await tx
				.update(gamePlayerTable)
				.set({ onTrial: false })
				.where(eq(gamePlayerTable.gameId, gameId));

			// Set the new player on trial
			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ onTrial: true })
				.where(
					and(eq(gamePlayerTable.gameId, gameId), eq(gamePlayerTable.actorId, actorId)),
				)
				.returning({ id: gamePlayerTable.id, number: gamePlayerTable.number });

			if (!updated) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
			}

			await afterTx(async () => {
				await realtime.publish(Resource.Realtime, Realtime.Trial, {
					gameId,
					actorNumber: updated.number,
				});
			});

			return { actorId };
		}),
);

/**
 * Clear all on-trial status for a game.
 */
export const clearOnTrial = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		createTransaction(async (tx) => {
			await tx
				.update(gamePlayerTable)
				.set({ onTrial: false })
				.where(eq(gamePlayerTable.gameId, gameId));

			return { gameId };
		}),
);

// ---------------------
// Poll count operations
// ---------------------

/**
 * Increment the poll count for a game.
 */
export const incrementPollCount = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		createTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ pollCount: sql`${gameTable.pollCount} + 1` })
				.where(eq(gameTable.id, gameId))
				.returning({ pollCount: gameTable.pollCount });

			if (!updated) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			return { pollCount: updated.pollCount };
		}),
);

/**
 * Reset the poll count for a game (typically at the start of a new day).
 */
export const resetPollCount = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		createTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ pollCount: 0 })
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);
