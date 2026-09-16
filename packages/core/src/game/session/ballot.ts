import { ActorStateSchema } from '@mafia/engine';
import { and, eq } from 'drizzle-orm';
import { Resource } from 'sst';
import { z } from 'zod';
import { afterTx, createTransaction, useTransaction } from '../../db/transaction';
import { InputError, isULID } from '../../error';
import { realtime } from '../../realtime';
import { fn } from '../../util/fn';
import { gamePlayerTable, gameTable } from '../game.sql';
import * as Assert from './assert';
import * as Events from './events';
import * as Log from './log';
import { GameSessionErrors as SessionErrors, VerdictSchema, type GamePlayer } from './schema';

// Internal persistence helpers join their caller's transaction via useTransaction.
export const tallyVotes = (players: GamePlayer[], aliveActorIds: string[]) => {
	const aliveActorIdSet = new Set(aliveActorIds);
	const votes: Record<string, number> = {};

	for (const player of players) {
		if (
			!aliveActorIdSet.has(player.actorId) ||
			player.voteTargetActorId === null ||
			!aliveActorIdSet.has(player.voteTargetActorId)
		)
			continue;
		votes[player.voteTargetActorId] = (votes[player.voteTargetActorId] ?? 0) + 1;
	}

	let maxVotes = 0;
	let winner: string | null = null;
	for (const [actorId, count] of Object.entries(votes)) {
		if (count <= maxVotes) continue;
		maxVotes = count;
		winner = actorId;
	}

	return {
		votes,
		winner: maxVotes > Math.floor(aliveActorIds.length / 2) ? winner : null,
	};
};

export const tallyVerdicts = (players: GamePlayer[], aliveActorIds: string[]) => {
	const aliveActorIdSet = new Set(aliveActorIds);
	let guiltyCount = 0;
	let abstainCount = 0;
	let innocentCount = 0;

	for (const player of players) {
		if (player.onTrial || !aliveActorIdSet.has(player.actorId)) continue;
		if (player.verdict === 'guilty') guiltyCount++;
		else if (player.verdict === 'innocent') innocentCount++;
		else abstainCount++;
	}

	return { guiltyCount, abstainCount, innocentCount, isGuilty: guiltyCount > innocentCount };
};

export const clearVotes = async (gameId: string) =>
	useTransaction(async (tx) => {
		await tx
			.update(gamePlayerTable)
			.set({ voteTargetActorId: null })
			.where(eq(gamePlayerTable.gameId, gameId));
	});

export const clearVerdicts = async (gameId: string) =>
	useTransaction(async (tx) => {
		await tx
			.update(gamePlayerTable)
			.set({ verdict: null })
			.where(eq(gamePlayerTable.gameId, gameId));
	});

export const submitVote = fn(
	z.object({
		gameId: isULID(),
		voterActorId: z.string(),
		targetActorId: z.string(),
	}),
	async ({ gameId, voterActorId, targetActorId }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({ status: gameTable.status, phase: gameTable.phase, actors: gameTable.actors })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.for('update');

			Assert.gameFound(game);
			Assert.gameActive(game);
			if (game.phase !== 'poll') {
				throw new InputError(
					SessionErrors.NotVotingPhase,
					'Voting is only allowed during the poll phase',
				);
			}

			const actors = ActorStateSchema.array().parse(game.actors);
			const voterActor = actors.find((actor) => actor.id === voterActorId);
			Assert.playerFound(voterActor);
			Assert.actorAlive(voterActor);

			const targetActor = actors.find((actor) => actor.id === targetActorId);
			if (!targetActor || !targetActor.alive) {
				throw new InputError(SessionErrors.InvalidVoteTarget, 'Invalid vote target');
			}
			if (voterActorId === targetActorId) {
				throw new InputError(SessionErrors.CannotVoteSelf, 'Cannot vote for yourself');
			}

			const [voter] = await tx
				.select()
				.from(gamePlayerTable)
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, voterActorId),
					),
				);
			Assert.playerFound(voter);

			const [target] = await tx
				.select()
				.from(gamePlayerTable)
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, targetActorId),
					),
				);
			if (!target) throw new InputError(SessionErrors.InvalidVoteTarget, 'Invalid vote target');

			const voteTargetActorId = voter.voteTargetActorId === targetActorId ? null : targetActorId;
			await tx
				.update(gamePlayerTable)
				.set({ voteTargetActorId })
				.where(eq(gamePlayerTable.id, voter.id));

			await Log.appendGameLog(tx, {
				gameId,
				type: voteTargetActorId === null ? 'game.vote.cancelled' : 'game.vote.cast',
				phase: 'poll',
				actorId: voterActorId,
				data: {
					voterActorNumber: voter.number,
					targetActorId: voteTargetActorId,
					targetActorNumber: voteTargetActorId === null ? null : target.number,
				},
			});

			await afterTx(async () => {
				if (voteTargetActorId === null) {
					await realtime.publish(Resource.Realtime, Events.Realtime.VoteCancel, {
						gameId,
						voterActorNumber: voter.number,
					});
					return;
				}
				await realtime.publish(Resource.Realtime, Events.Realtime.Vote, {
					gameId,
					voterActorNumber: voter.number,
					targetActorNumber: target.number,
				});
			});

			return { voteTargetActorId };
		}),
);

export const cancelVote = fn(
	z.object({ gameId: isULID(), voterActorId: z.string() }),
	async ({ gameId, voterActorId }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({ status: gameTable.status, phase: gameTable.phase })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.for('update');
			Assert.gameFound(game);
			Assert.gameActive(game);
			if (game.phase !== 'poll') {
				throw new InputError(
					SessionErrors.NotVotingPhase,
					'Voting is only allowed during the poll phase',
				);
			}

			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ voteTargetActorId: null })
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, voterActorId),
					),
				)
				.returning({ id: gamePlayerTable.id, number: gamePlayerTable.number });
			Assert.playerFound(updated);

			await Log.appendGameLog(tx, {
				gameId,
				type: 'game.vote.cancelled',
				phase: 'poll',
				actorId: voterActorId,
				data: { voterActorNumber: updated.number },
			});
			await afterTx(async () => {
				await realtime.publish(Resource.Realtime, Events.Realtime.VoteCancel, {
					gameId,
					voterActorNumber: updated.number,
				});
			});
			return { voterActorId };
		}),
);

export const submitVerdict = fn(
	z.object({ gameId: isULID(), voterActorId: z.string(), verdict: VerdictSchema }),
	async ({ gameId, voterActorId, verdict }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({ status: gameTable.status, phase: gameTable.phase, actors: gameTable.actors })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.for('update');
			Assert.gameFound(game);
			Assert.gameActive(game);
			if (game.phase !== 'trial') {
				throw new InputError(
					SessionErrors.NotTrialPhase,
					'Verdicts are only allowed during the trial phase',
				);
			}

			const voterActor = ActorStateSchema.array()
				.parse(game.actors)
				.find((actor) => actor.id === voterActorId);
			Assert.playerFound(voterActor);
			Assert.actorAlive(voterActor);

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
			Assert.playerFound(player);
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
				.returning({ number: gamePlayerTable.number });
			Assert.playerFound(updated);

			await Log.appendGameLog(tx, {
				gameId,
				type: 'game.verdict.submitted',
				phase: 'trial',
				actorId: voterActorId,
				data: { voterActorNumber: updated.number, verdict },
			});
			await afterTx(async () => {
				await realtime.publish(Resource.Realtime, Events.Realtime.Verdict, {
					gameId,
					voterActorNumber: updated.number,
					verdict,
				});
			});
			return { voterActorId, verdict };
		}),
);
