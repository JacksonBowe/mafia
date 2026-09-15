import { ActorStateSchema } from '@mafia/engine';
import { and, eq } from 'drizzle-orm';
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
import { GameSessionErrors as SessionErrors } from './schema';

export const submitVote = fn(
	z.object({
		gameId: isULID(),
		voterActorId: z.string(),
		targetActorId: z.string(),
	}),
	async ({ gameId, voterActorId, targetActorId }) =>
		createTransaction(async (tx) => {
			// Votes may only be cast/toggled during the poll phase.
			const [game] = await tx
				.select({ phase: gameTable.phase, actors: gameTable.actors })
				.from(gameTable)
				.where(eq(gameTable.id, gameId));

			if (!game) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			if (game.phase !== 'poll') {
				throw new InputError(
					SessionErrors.NotVotingPhase,
					'Voting is only allowed during the poll phase',
				);
			}

			const actors = ActorStateSchema.array().parse(game.actors);
			const voterActor = actors.find((actor) => actor.id === voterActorId);

			if (!voterActor) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Voter not found');
			}

			if (!voterActor.alive) {
				throw new InputError(SessionErrors.PlayerNotAlive, 'Player is not alive');
			}

			const targetActor = actors.find((actor) => actor.id === targetActorId);
			if (!targetActor || !targetActor.alive) {
				throw new InputError(SessionErrors.InvalidVoteTarget, 'Invalid vote target');
			}

			// Get the voter's current state
			const [voter] = await tx
				.select()
				.from(gamePlayerTable)
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, voterActorId),
					),
				);

			if (!voter) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Voter not found');
			}

			// Verify target belongs to this game.
			const [target] = await tx
				.select()
				.from(gamePlayerTable)
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, targetActorId),
					),
				);

			if (!target) {
				throw new InputError(SessionErrors.InvalidVoteTarget, 'Invalid vote target');
			}

			// Cannot vote for yourself
			if (voterActorId === targetActorId) {
				throw new InputError(SessionErrors.CannotVoteSelf, 'Cannot vote for yourself');
			}

			// If already voting for this target, remove the vote (toggle)
			const voteTargetActorId =
				voter.voteTargetActorId === targetActorId ? null : targetActorId;

			await tx
				.update(gamePlayerTable)
				.set({ voteTargetActorId })
				.where(eq(gamePlayerTable.id, voter.id));

			await appendGameLog(tx, {
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
					await realtime.publish(Resource.Realtime, Realtime.VoteCancel, {
						gameId,
						voterActorNumber: voter.number,
					});
					return;
				}

				await realtime.publish(Resource.Realtime, Realtime.Vote, {
					gameId,
					voterActorNumber: voter.number,
					targetActorNumber: target.number,
				});
			});

			return { voteTargetActorId };
		}),
);

/**
 * Cancel a player's vote.
 */
export const cancelVote = fn(
	z.object({
		gameId: isULID(),
		voterActorId: z.string(),
	}),
	async ({ gameId, voterActorId }) =>
		createTransaction(async (tx) => {
			// Votes may only be cancelled during the poll phase.
			const [game] = await tx
				.select({ phase: gameTable.phase })
				.from(gameTable)
				.where(eq(gameTable.id, gameId));

			if (!game) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

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

			if (!updated) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.vote.cancelled',
				phase: 'poll',
				actorId: voterActorId,
				data: { voterActorNumber: updated.number },
			});

			await afterTx(async () => {
				await realtime.publish(Resource.Realtime, Realtime.VoteCancel, {
					gameId,
					voterActorNumber: updated.number,
				});
			});

			return { voterActorId };
		}),
);

/**
 * Clear all votes for a game.
 */
export const clearVotes = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		createTransaction(async (tx) => {
			await tx
				.update(gamePlayerTable)
				.set({ voteTargetActorId: null })
				.where(eq(gamePlayerTable.gameId, gameId));

			return { gameId };
		}),
);

/**
 * Tally votes and determine if there's a majority.
 * Returns the target actor id with majority (>50% of alive actors) or null.
 */
export const tallyVotes = fn(
	z.object({
		gameId: isULID(),
		aliveActorIds: z.array(z.string()),
	}),
	async ({ gameId, aliveActorIds }) =>
		useTransaction(async (tx) => {
			// Get all votes from alive players
			const players = await tx
				.select({
					actorId: gamePlayerTable.actorId,
					voteTargetActorId: gamePlayerTable.voteTargetActorId,
				})
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			// Count votes only from alive players
			const aliveActorIdSet = new Set(aliveActorIds);
			const votes: Record<string, number> = {};

			for (const player of players) {
				if (aliveActorIdSet.has(player.actorId) && player.voteTargetActorId !== null) {
					votes[player.voteTargetActorId] = (votes[player.voteTargetActorId] || 0) + 1;
				}
			}

			// Find the player with the most votes
			let maxVotes = 0;
			let maxVotedActorId: string | null = null;

			for (const [target, count] of Object.entries(votes)) {
				if (count > maxVotes) {
					maxVotes = count;
					maxVotedActorId = target;
				}
			}

			// Check for majority (> 50% of alive players)
			const majorityThreshold = Math.floor(aliveActorIds.length / 2);
			const hasMajority = maxVotes > majorityThreshold;

			return {
				votes,
				winner: hasMajority ? maxVotedActorId : null,
				hasMajority,
				totalVotes: Object.values(votes).reduce((sum, count) => sum + count, 0),
				aliveCount: aliveActorIds.length,
			};
		}),
);

// ---------------------
// Verdict operations
// ---------------------

/**
 * Submit a player's trial verdict (guilty/innocent/abstain).
 */
