import { SFNClient, StopExecutionCommand } from '@aws-sdk/client-sfn';
import {
	ActorStateSchema,
	GameConfigSchema,
	GameEventGroupDumpSchema,
	GameStateSchema,
	lynchGame,
	loadGame,
	resolveGame,
	StateGraveyardRecordSchema,
	WinnerSummarySchema,
	type ActorState,
	type GameConfig,
	type GameEventGroupDump,
	type GameState,
	type StateGraveyardRecord,
	type WinnerSummary,
} from '@mafia/engine';
import { and, eq, sql } from 'drizzle-orm';
import { Resource } from 'sst';
import { ulid } from 'ulid';
import { z } from 'zod';
import { afterTx, createTransaction, useTransaction } from '../db/transaction';
import { InputError, isULID } from '../error';
import { MessageSchema } from '../message';
import { defineRealtimeEvent, realtime } from '../realtime';
import { fn } from '../util/fn';
import { gamePlayerTable, gameTable } from './game.sql';
import { appendEngineLog, appendGameLog, type GameLogInput, type EngineLogInput } from './log';
import {
	ClientGameInfoSchema,
	GameErrors as Errors,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics,
	VerdictSchema,
	type GameInfo,
	type GamePhase,
	type GamePlayer,
	type GameStatus,
	type GameSyncResponse,
} from './schema';

export * as Game from './';

// Re-export pure contracts for backend convenience.
export type {
	ActorState,
	ClientGameInfo,
	GameConfig,
	GameInfo,
	GamePhase,
	GamePlayer,
	GameState,
	GameStatus,
	GameSyncResponse,
	Verdict,
} from './schema';
export {
	ClientGameInfoSchema,
	Errors,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics,
	VerdictSchema,
};

// ---------------------
// Realtime events (server-only — depend on defineRealtimeEvent / IoT)
// ---------------------

export const RealtimeEvents = {
	// ==================
	// Public Events (broadcast to all players)
	// ==================

	/**
	 * Phase change event - sent when the game transitions to a new phase.
	 * Frontend uses this to update UI and start countdown timer.
	 */
	PhaseChange: defineRealtimeEvent(
		'game.phase',
		z.object({
			gameId: isULID(),
			phase: z.string(),
			duration: z.number().int(),
			label: z.string(),
			sequence: z.number().int(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Vote event - sent when a player casts a vote during POLL phase.
	 */
	Vote: defineRealtimeEvent(
		'game.vote',
		z.object({
			gameId: isULID(),
			voterActorNumber: z.number().int(),
			targetActorNumber: z.number().int(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Vote cancel event - sent when a player cancels their vote.
	 */
	VoteCancel: defineRealtimeEvent(
		'game.votecancel',
		z.object({
			gameId: isULID(),
			voterActorNumber: z.number().int(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Trial event - sent when a player is put on trial.
	 */
	Trial: defineRealtimeEvent(
		'game.trial',
		z.object({
			gameId: isULID(),
			actorNumber: z.number().int(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Trial over event - sent when trial phase ends (moving to evening).
	 */
	TrialOver: defineRealtimeEvent(
		'game.trial_over',
		z.object({
			gameId: isULID(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * State update event - sent when game state changes.
	 * Contains public game state that all players can see.
	 */
	State: defineRealtimeEvent(
		'game.state',
		z.object({
			gameId: isULID(),
			state: z.unknown(), // GameState from engine
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Deaths event - sent during MORNING phase to announce deaths from the night.
	 */
	Deaths: defineRealtimeEvent(
		'game.deaths',
		z.object({
			gameId: isULID(),
			deaths: z.array(StateGraveyardRecordSchema),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Game over event - sent when the game ends with winners.
	 */
	GameOver: defineRealtimeEvent(
		'game.over',
		z.object({
			gameId: isULID(),
			winners: z.array(WinnerSummarySchema),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Game terminated event - sent when the game is aborted/cancelled.
	 */
	Terminated: defineRealtimeEvent(
		'game.terminated',
		z.object({
			gameId: isULID(),
			error: z.string().optional(),
			message: z.string().optional(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Verdict event - sent when a player submits a verdict during TRIAL phase.
	 */
	Verdict: defineRealtimeEvent(
		'game.verdict',
		z.object({
			gameId: isULID(),
			voterActorNumber: z.number().int(),
			verdict: VerdictSchema,
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Lynch result event - sent after TRIAL phase to announce the verdict result.
	 */
	LynchResult: defineRealtimeEvent(
		'game.lynch_result',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			guiltyCount: z.number().int(),
			abstainCount: z.number().int(),
			innocentCount: z.number().int(),
			isGuilty: z.boolean(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	// ==================
	// Private Events (to specific player via actor channel)
	// ==================

	/**
	 * Actor update event - sent to a specific player with their private actor data.
	 * Includes role, targets, allies, and other private information.
	 */
	ActorUpdate: defineRealtimeEvent(
		'game.actor',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			actor: ActorStateSchema,
		}),
		(p) => GameTopics.actor(p.gameId, p.actorId),
	),

	/**
	 * Game event - sent to specific player(s) with night action results.
	 * e.g., "You were attacked but survived due to Night Immunity"
	 */
	Event: defineRealtimeEvent(
		'game.event',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			eventId: z.string(),
			message: z.string(),
			duration: z.number().int().default(0),
		}),
		(p) => GameTopics.actor(p.gameId, p.actorId),
	),

	/**
	 * Role reveal event - sent to a player during PREGAME to reveal their role.
	 */
	RoleReveal: defineRealtimeEvent(
		'game.role_reveal',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			role: z.string(),
			allies: z.array(
				z.object({
					playerNumber: z.number().int(),
					alias: z.string(),
					role: z.string().optional(),
				}),
			),
		}),
		(p) => GameTopics.actor(p.gameId, p.actorId),
	),

	/**
	 * Targets update event - sent to a player when their available targets change.
	 */
	TargetsUpdate: defineRealtimeEvent(
		'game.targets',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			possibleTargets: z.array(z.array(z.number().int())),
		}),
		(p) => GameTopics.actor(p.gameId, p.actorId),
	),
};

// ---------------------
// Core functions
// ---------------------

export const create = fn(
	z.object({
		engineState: z.unknown(),
		engineConfig: z.unknown(),
		actors: z.unknown(),
		engineLog: z.array(z.string()),
		players: z.array(
			z.object({
				userId: z.string(),
				actorId: z.string(),
				number: z.number().int().positive(),
			}),
		),
	}),
	async (input) =>
		createTransaction(async (tx) => {
			const gameId = ulid();

			// Insert game record
			await tx.insert(gameTable).values({
				id: gameId,
				status: 'active',
				phase: 'pregame',
				pollCount: 0,
				engineState: input.engineState,
				engineConfig: input.engineConfig,
				actors: input.actors,
			});

			// Insert game players
			if (input.players.length > 0) {
				await tx.insert(gamePlayerTable).values(
					input.players.map((p) => ({
						id: ulid(),
						gameId,
						userId: p.userId,
						actorId: p.actorId,
						number: p.number,
						voteTargetActorId: null,
						verdict: null,
						onTrial: false,
						targetActorIds: [],
					})),
				);
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.started',
				phase: 'pregame',
				data: {
					players: input.players,
					config: input.engineConfig,
				},
			});
			await appendEngineLog(tx, {
				gameId,
				operation: 'new-game',
				phase: 'pregame',
				data: { actorCount: input.players.length },
				lines: input.engineLog,
			});

			return { gameId };
		}),
);

const ActorIdTargetsSchema = z.array(z.string());

export function buildEngineActors(actors: unknown, players: GamePlayer[]): ActorState[] {
	const parsedActors = ActorStateSchema.array().parse(actors);
	const parsedPlayers = GamePlayerSchema.array().parse(players);
	const actorsById = new Map(parsedActors.map((actor) => [actor.id, actor]));
	const targetNumbersByActorId = new Map(
		parsedPlayers.map((player) => [
			player.actorId,
			player.targetActorIds
				.map((targetActorId) => actorsById.get(targetActorId)?.number)
				.filter((number): number is number => number !== undefined),
		]),
	);

	return parsedActors.map((actor) => ({
		...actor,
		targets: targetNumbersByActorId.get(actor.id) ?? [],
	}));
}

export const updateEvents = fn(
	z.object({
		gameId: isULID(),
		events: GameEventGroupDumpSchema.nullable(),
	}),
	async ({ gameId, events }) =>
		useTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ events })
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const setTargets = fn(
	z.object({
		gameId: isULID(),
		userId: z.string(),
		targetActorIds: ActorIdTargetsSchema,
	}),
	async ({ gameId, userId, targetActorIds }) =>
		createTransaction(async (tx) => {
			const [row] = await tx
				.select({ actors: gameTable.actors, phase: gameTable.phase })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);

			if (!row) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			const [player] = await tx
				.select({ actorId: gamePlayerTable.actorId })
				.from(gamePlayerTable)
				.where(and(eq(gamePlayerTable.gameId, gameId), eq(gamePlayerTable.userId, userId)))
				.limit(1);

			if (!player) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			const actors = ActorStateSchema.array().parse(row.actors);
			const actor = actors.find((item) => item.id === player.actorId);

			if (!actor) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			const numbersByActorId = new Map(actors.map((item) => [item.id, item.number]));

			for (const [index, targetActorId] of targetActorIds.entries()) {
				const targetNumber = numbersByActorId.get(targetActorId);
				const allowed = actor.possibleTargets[index] ?? [];
				if (targetNumber === undefined || !allowed.includes(targetNumber)) {
					throw new InputError(Errors.InvalidTarget, 'Invalid target');
				}
			}

			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ targetActorIds })
				.where(and(eq(gamePlayerTable.gameId, gameId), eq(gamePlayerTable.userId, userId)))
				.returning({ id: gamePlayerTable.id });

			if (!updated) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.targets.set',
				phase: GamePhaseSchema.parse(row.phase),
				actorId: player.actorId,
				data: {
					actorNumber: actor.number ?? null,
					targetActorIds,
					targetActorNumbers: targetActorIds.map(
						(id) => numbersByActorId.get(id) ?? null,
					),
				},
			});

			return { gameId, userId, targetActorIds };
		}),
);

export const clearTargets = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		useTransaction(async (tx) => {
			await tx
				.update(gamePlayerTable)
				.set({ targetActorIds: [] })
				.where(eq(gamePlayerTable.gameId, gameId));

			return { gameId };
		}),
);

export const recordChatMessage = fn(
	z.object({
		gameId: isULID(),
		actorId: z.string(),
		message: MessageSchema,
	}),
	async ({ gameId, actorId, message }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({ phase: gameTable.phase })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);
			if (!game) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.chat.sent',
				phase: GamePhaseSchema.parse(game.phase),
				actorId,
				data: { message },
			});
			return { gameId, messageId: message.id };
		}),
);

/**
 * Build a game sync payload for a specific user.
 * Finds the user's active game, extracts public state, config, and their private actor.
 */
export const sync = fn(z.object({ userId: z.string() }), async ({ userId }) =>
	useTransaction(async (tx) => {
		// Find the player's active game
		const [playerRow] = await tx
			.select({
				gameId: gamePlayerTable.gameId,
				actorId: gamePlayerTable.actorId,
			})
			.from(gamePlayerTable)
			.innerJoin(gameTable, eq(gameTable.id, gamePlayerTable.gameId))
			.where(and(eq(gamePlayerTable.userId, userId), eq(gameTable.status, 'active')))
			.limit(1);

		if (!playerRow) {
			return null;
		}

		const { gameId } = playerRow;

		// Fetch game record
		const [game] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

		if (!game) {
			throw new InputError(Errors.GameNotFound, 'Game not found');
		}

		// Parse engine state and config — schemas re-exported from engine (source of truth)
		const state: GameState = GameStateSchema.parse(game.engineState);

		const config: GameConfig = GameConfigSchema.parse(game.engineConfig);

		// Extract the requesting user's actor from the actors array
		const actors = (game.actors ?? []) as ActorState[];

		const rawActor = actors.find((a) => a.id === playerRow.actorId);

		if (!rawActor) {
			throw new InputError(Errors.PlayerNotFound, 'Actor not found for player');
		}

		const myActor: ActorState = ActorStateSchema.parse(rawActor);

		// Phase-scoped vote tally (voter number -> target number). Votes only
		// matter during the poll phase, so surface an empty map otherwise to
		// avoid showing stale votes on reload / late-join.
		const votes: Record<number, number> = {};
		if (game.phase === 'poll') {
			const players = await tx
				.select({
					number: gamePlayerTable.number,
					actorId: gamePlayerTable.actorId,
					voteTargetActorId: gamePlayerTable.voteTargetActorId,
				})
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			const numberByActorId = new Map(players.map((p) => [p.actorId, p.number]));
			for (const player of players) {
				if (player.voteTargetActorId === null) continue;
				const targetNumber = numberByActorId.get(player.voteTargetActorId);
				if (targetNumber !== undefined) {
					votes[player.number] = targetNumber;
				}
			}
		}

		const info = ClientGameInfoSchema.parse({
			id: gameId,
			status: game.status,
			phase: game.phase,
			pollCount: game.pollCount,
			syncTs: game.updatedAt.getTime(),
		});

		return { info, state, config, actor: myActor, votes } satisfies GameSyncResponse;
	}),
);

// ---------------------
// Vote operations
// ---------------------

/**
 * Submit or change a player's vote during POLL phase.
 * If target matches current vote, the vote is removed (toggle behavior).
 */
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
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			if (game.phase !== 'poll') {
				throw new InputError(
					Errors.NotVotingPhase,
					'Voting is only allowed during the poll phase',
				);
			}

			const actors = ActorStateSchema.array().parse(game.actors);
			const voterActor = actors.find((actor) => actor.id === voterActorId);

			if (!voterActor) {
				throw new InputError(Errors.PlayerNotFound, 'Voter not found');
			}

			if (!voterActor.alive) {
				throw new InputError(Errors.PlayerNotAlive, 'Player is not alive');
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
				throw new InputError(Errors.PlayerNotFound, 'Voter not found');
			}

			// Verify target exists
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
				throw new InputError(Errors.InvalidVoteTarget, 'Invalid vote target');
			}

			// Cannot vote for yourself
			if (voterActorId === targetActorId) {
				throw new InputError(Errors.CannotVoteSelf, 'Cannot vote for yourself');
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
					await realtime.publish(Resource.Realtime, RealtimeEvents.VoteCancel, {
						gameId,
						voterActorNumber: voter.number,
					});
					return;
				}

				await realtime.publish(Resource.Realtime, RealtimeEvents.Vote, {
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
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			if (game.phase !== 'poll') {
				throw new InputError(
					Errors.NotVotingPhase,
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
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.vote.cancelled',
				phase: 'poll',
				actorId: voterActorId,
				data: { voterActorNumber: updated.number },
			});

			await afterTx(async () => {
				await realtime.publish(Resource.Realtime, RealtimeEvents.VoteCancel, {
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
		useTransaction(async (tx) => {
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
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			if (game.phase !== 'trial') {
				throw new InputError(
					Errors.NotTrialPhase,
					'Verdicts are only allowed during the trial phase',
				);
			}

			const actors = ActorStateSchema.array().parse(game.actors);
			const voterActor = actors.find((actor) => actor.id === voterActorId);
			if (!voterActor) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			if (!voterActor.alive) {
				throw new InputError(Errors.PlayerNotAlive, 'Player is not alive');
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
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			if (player.onTrial) {
				throw new InputError(
					Errors.GameInvalidState,
					'Player on trial cannot submit verdict',
				);
			}

			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ verdict })
				.where(eq(gamePlayerTable.id, player.id))
				.returning({ id: gamePlayerTable.id, number: gamePlayerTable.number });

			if (!updated) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.verdict.submitted',
				phase: 'trial',
				actorId: voterActorId,
				data: { voterActorNumber: updated.number, verdict },
			});

			await afterTx(async () => {
				await realtime.publish(Resource.Realtime, RealtimeEvents.Verdict, {
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
		useTransaction(async (tx) => {
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
		useTransaction(async (tx) => {
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
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			await afterTx(async () => {
				await realtime.publish(Resource.Realtime, RealtimeEvents.Trial, {
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
		useTransaction(async (tx) => {
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
		useTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ pollCount: sql`${gameTable.pollCount} + 1` })
				.where(eq(gameTable.id, gameId))
				.returning({ pollCount: gameTable.pollCount });

			if (!updated) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
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
		useTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ pollCount: 0 })
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const get = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		useTransaction(async (tx) => {
			const [game] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

			if (!game) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			const players = await tx
				.select()
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			return GameInfoSchema.parse({
				...game,
				players,
			});
		}),
);

export const updateState = fn(
	z.object({
		gameId: isULID(),
		engineState: z.unknown(),
		actors: z.unknown(),
		phase: GamePhaseSchema.optional(),
		status: GameStatusSchema.optional(),
	}),
	async ({ gameId, engineState, actors, phase, status }) =>
		useTransaction(async (tx) => {
			const updates: Record<string, unknown> = {
				engineState,
				actors,
			};

			if (phase) updates.phase = phase;
			if (status) updates.status = status;

			const [updated] = await tx
				.update(gameTable)
				.set(updates)
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const setGameLoopExecutionArn = fn(
	z.object({
		gameId: isULID(),
		executionArn: z.string().min(1),
	}),
	async ({ gameId, executionArn }) =>
		useTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ gameLoopExecutionArn: executionArn })
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const list = () =>
	useTransaction(async (tx) =>
		tx
			.select({
				id: gameTable.id,
				status: gameTable.status,
				createdAt: gameTable.createdAt,
			})
			.from(gameTable)
			.where(eq(gameTable.status, 'active')),
	);

export const getByPlayer = fn(
	z.object({
		userId: z.string(),
	}),
	async ({ userId }) =>
		useTransaction(async (tx) => {
			// Find the player's active game
			const [playerGame] = await tx
				.select({
					gameId: gamePlayerTable.gameId,
				})
				.from(gamePlayerTable)
				.innerJoin(gameTable, eq(gameTable.id, gamePlayerTable.gameId))
				.where(and(eq(gamePlayerTable.userId, userId), eq(gameTable.status, 'active')))
				.limit(1);

			if (!playerGame) {
				return null;
			}

			return get({ gameId: playerGame.gameId });
		}),
);

export const terminate = fn(
	z.object({
		gameId: isULID(),
		terminatedByUserId: z.string().optional(),
		reason: z.string().min(1).optional(),
	}),
	async ({ gameId, terminatedByUserId, reason }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({
					id: gameTable.id,
					status: gameTable.status,
					phase: gameTable.phase,
					gameLoopExecutionArn: gameTable.gameLoopExecutionArn,
				})
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);

			if (!game) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}
			if (game.status !== 'active') {
				throw new InputError(Errors.GameInvalidState, 'Game is not active');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.terminated',
				phase: GamePhaseSchema.parse(game.phase),
				data: {
					reason: reason ?? 'terminated',
					terminatedByUserId: terminatedByUserId ?? null,
				},
			});

			const [cancelled] = await tx
				.update(gameTable)
				.set({ status: 'cancelled' })
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!cancelled) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			await afterTx(async () => {
				if (game.gameLoopExecutionArn) {
					const sfnClient = new SFNClient({});

					try {
						await sfnClient.send(
							new StopExecutionCommand({
								executionArn: game.gameLoopExecutionArn,
							}),
						);
					} catch (error) {
						console.error('Failed to stop game loop execution', { gameId, error });
					}
				}

				await realtime.publish(Resource.Realtime, RealtimeEvents.Terminated, {
					gameId,
					message: reason ?? 'Game terminated',
				});
			});

			return { gameId };
		}),
);

type AdvancePhaseResult = {
	waitSeconds: number;
	nextPhase: GamePhase;
	continue: boolean;
	status?: GameStatus;
	pollCount?: number;
	engineState?: GameState;
	actors?: ActorState[];
	events?: GameEventGroupDump | null;
	deaths?: StateGraveyardRecord[];
	winners?: WinnerSummary[];
	lynchResult?: {
		actorId: string;
		guiltyCount: number;
		abstainCount: number;
		innocentCount: number;
		isGuilty: boolean;
	};
	trialActorNumber?: number;
	trialOver?: boolean;
	engineLogs?: Array<Omit<EngineLogInput, 'gameId'>>;
};

const PHASE_INFO: Record<GamePhase, { duration: number }> = {
	pregame: { duration: 15 },
	day: { duration: 15 }, // 120 really, but test with shorter time for my sanity
	evening: { duration: 15 }, // 60 really, but test with shorter time for my sanity
	night: { duration: 0 },
	morning: { duration: 0 },
	poll: { duration: 20 },
	defense: { duration: 20 },
	trial: { duration: 20 },
	lynch: { duration: 10 },
};

const MAX_POLLS = 3;
const BASE_MORNING_DURATION = 5;
const TIME_PER_DEATH = 5;

const enterPhase = (
	nextPhase: GamePhase,
	overrides: Partial<AdvancePhaseResult> = {},
): AdvancePhaseResult => ({
	nextPhase,
	waitSeconds: PHASE_INFO[nextPhase].duration,
	continue: true,
	...overrides,
});

const getAliveActorIds = (actors: ActorState[]) =>
	actors.filter((actor) => actor.alive).map((actor) => actor.id);

const getNightDeaths = (game: GameInfo) =>
	game.engineState.graveyard.filter((death) => death.dod === game.engineState.day);

const tallyVotesForPlayers = (players: GamePlayer[], aliveActorIds: string[]) => {
	const aliveActorIdSet = new Set(aliveActorIds);
	const votes: Record<string, number> = {};

	for (const player of players) {
		if (!aliveActorIdSet.has(player.actorId) || player.voteTargetActorId === null) continue;
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

const tallyVerdictsForPlayers = (players: GamePlayer[], aliveActorIds: string[]) => {
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

const nextPollOrEvening = (pollCount: number, overrides: Partial<AdvancePhaseResult> = {}) => {
	if (pollCount < MAX_POLLS) return enterPhase('poll', { pollCount, ...overrides });
	return enterPhase('evening', { pollCount: 0, ...overrides });
};

const titleCasePhase = (phase: GamePhase) => phase.charAt(0).toUpperCase() + phase.slice(1);

const getPhaseLabel = (phase: GamePhase, pollCount: number) => {
	if (phase === 'poll') return `Poll ${pollCount + 1}`;
	return titleCasePhase(phase);
};

const getPhaseSequence = (phase: GamePhase, pollCount: number) => {
	if (phase === 'poll') return pollCount;
	return 0;
};

const processEvening = (game: GameInfo): AdvancePhaseResult => {
	const resolved = resolveGame({
		state: game.engineState,
		config: game.engineConfig,
		actors: buildEngineActors(game.actors, game.players),
	});

	// TODO: Fan out resolved.events to RealtimeEvents.Event once event target/topic mapping is finalized.
	return enterPhase('night', {
		waitSeconds: resolved.events.duration,
		engineState: resolved.state,
		actors: resolved.actors,
		events: resolved.events,
		engineLogs: [
			{
				operation: 'resolve',
				phase: 'evening',
				data: {
					day: resolved.state.day,
					eventDuration: resolved.events.duration,
					winners: resolved.winners,
				},
				lines: resolved.log,
			},
		],
	});
};

const processNight = (game: GameInfo): AdvancePhaseResult => {
	const engineResult = loadGame({
		state: game.engineState,
		config: game.engineConfig,
		actors: buildEngineActors(game.actors, game.players),
	});
	const deaths = getNightDeaths(game);
	const waitSeconds = BASE_MORNING_DURATION + deaths.length * TIME_PER_DEATH;

	if (engineResult.winners && engineResult.winners.length > 0) {
		return enterPhase('morning', {
			waitSeconds,
			continue: false,
			status: 'completed',
			deaths,
			winners: engineResult.winners,
			engineLogs: [
				{
					operation: 'load-win-check',
					phase: 'night',
					data: { day: game.engineState.day, winners: engineResult.winners },
					lines: engineResult.log,
				},
			],
		});
	}

	return enterPhase('morning', {
		waitSeconds,
		deaths,
		engineLogs: [
			{
				operation: 'load-win-check',
				phase: 'night',
				data: { day: game.engineState.day, winners: null },
				lines: engineResult.log,
			},
		],
	});
};

const serializeLifecycleError = (error: unknown, depth = 0): Record<string, unknown> => {
	if (!(error instanceof Error)) {
		return { name: 'NonError', message: String(error), stack: null, cause: null };
	}

	return {
		name: error.name,
		message: error.message,
		stack: error.stack ?? null,
		cause:
			error.cause instanceof Error && depth < 3
				? serializeLifecycleError(error.cause, depth + 1)
				: null,
	};
};

const recordAdvancePhaseError = async (gameId: string, error: unknown) => {
	if (error instanceof InputError && error.code === Errors.GameNotFound) return;

	try {
		await createTransaction(async (tx) => {
			const [game] = await tx
				.select({ phase: gameTable.phase })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);
			if (!game) return;

			await appendGameLog(tx, {
				gameId,
				type: 'game.error',
				phase: GamePhaseSchema.parse(game.phase),
				data: {
					operation: 'advance-phase',
					...serializeLifecycleError(error),
				},
			});
		});
	} catch (logError) {
		console.error('Failed to record game lifecycle error', { gameId, error: logError });
	}
};

export const advancePhase = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		createTransaction(async (tx) => {
			const [gameRow] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

			if (!gameRow) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			const players = await tx
				.select()
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));
			const game = GameInfoSchema.parse({ ...gameRow, players });

			if (game.status !== 'active') {
				return {
					gameId,
					continue: false,
					waitSeconds: 0,
					phase: game.phase,
					pollCount: game.pollCount,
				};
			}

			const clearVotes = () =>
				tx
					.update(gamePlayerTable)
					.set({ voteTargetActorId: null })
					.where(eq(gamePlayerTable.gameId, gameId));
			const clearVerdicts = () =>
				tx
					.update(gamePlayerTable)
					.set({ verdict: null })
					.where(eq(gamePlayerTable.gameId, gameId));
			const clearOnTrial = () =>
				tx
					.update(gamePlayerTable)
					.set({ onTrial: false })
					.where(eq(gamePlayerTable.gameId, gameId));

			const aliveActorIds = getAliveActorIds(game.actors);
			let result: AdvancePhaseResult;
			const auditEntries: Array<Omit<GameLogInput, 'gameId'>> = [];

			switch (game.phase) {
				case 'pregame':
					result = enterPhase('evening');
					break;

				case 'day':
					await clearVotes();
					await clearVerdicts();
					await clearOnTrial();
					result = enterPhase('poll', { pollCount: 0 });
					break;

				case 'poll': {
					const nextPollCount = game.pollCount + 1;
					const voteTally = tallyVotesForPlayers(game.players, aliveActorIds);
					await clearVotes();
					auditEntries.push({
						type: 'game.poll.tallied',
						phase: 'poll',
						data: { ...voteTally, pollCount: nextPollCount },
					});

					if (voteTally.winner) {
						const [trialPlayer] = await tx
							.update(gamePlayerTable)
							.set({ onTrial: true })
							.where(
								and(
									eq(gamePlayerTable.gameId, gameId),
									eq(gamePlayerTable.actorId, voteTally.winner),
								),
							)
							.returning({ number: gamePlayerTable.number });

						if (!trialPlayer) {
							throw new InputError(Errors.PlayerNotFound, 'Player not found');
						}

						result = enterPhase('defense', {
							pollCount: nextPollCount,
							trialActorNumber: trialPlayer.number,
						});
						break;
					}

					result = nextPollOrEvening(nextPollCount);
					break;
				}

				case 'defense':
					result = enterPhase('trial');
					break;

				case 'trial': {
					const trialPlayer = game.players.find((player) => player.onTrial);
					if (!trialPlayer) {
						throw new InputError(Errors.GameInvalidState, 'No player on trial');
					}

					const verdictTally = tallyVerdictsForPlayers(game.players, aliveActorIds);
					const lynchResult = { actorId: trialPlayer.actorId, ...verdictTally };
					auditEntries.push({
						type: 'game.verdict.tallied',
						phase: 'trial',
						actorId: trialPlayer.actorId,
						data: lynchResult,
					});

					if (verdictTally.isGuilty) {
						result = enterPhase('lynch', { lynchResult });
						break;
					}

					await clearVerdicts();
					await clearOnTrial();
					result = nextPollOrEvening(game.pollCount, { lynchResult, trialOver: true });
					break;
				}

				case 'lynch': {
					const trialPlayer = game.players.find((player) => player.onTrial);
					if (!trialPlayer) {
						throw new InputError(Errors.GameInvalidState, 'No player on trial');
					}
					const verdictTally = tallyVerdictsForPlayers(game.players, aliveActorIds);

					const lynched = lynchGame({
						state: game.engineState,
						config: game.engineConfig,
						actors: buildEngineActors(game.actors, game.players),
						actorNumber: trialPlayer.number,
					});
					await clearOnTrial();
					await clearVerdicts();
					result = nextPollOrEvening(game.pollCount, {
						engineState: lynched.state,
						actors: lynched.actors,
						trialOver: true,
						engineLogs: [
							{
								operation: 'lynch',
								phase: 'lynch',
								data: {
									actorNumber: trialPlayer.number,
									actorId: trialPlayer.actorId,
									...verdictTally,
									outcome: 'lynched',
								},
								lines: lynched.log,
							},
						],
					});
					break;
				}

				case 'evening':
					result = processEvening(game);
					await tx
						.update(gamePlayerTable)
						.set({ targetActorIds: [] })
						.where(eq(gamePlayerTable.gameId, gameId));
					break;

				case 'night':
					result = processNight(game);
					break;

				case 'morning':
					result = enterPhase('day');
					break;

				default:
					throw new InputError(Errors.GameInvalidState, 'Invalid game phase');
			}

			const updates: Record<string, unknown> = { phase: result.nextPhase };
			if (result.status) updates.status = result.status;
			if (result.pollCount !== undefined) updates.pollCount = result.pollCount;
			if (result.engineState) updates.engineState = result.engineState;
			if (result.actors) updates.actors = result.actors;
			if (result.events !== undefined) updates.events = result.events;

			const [updated] = await tx
				.update(gameTable)
				.set(updates)
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.phase.entered',
				phase: result.nextPhase,
				data: {
					fromPhase: game.phase,
					waitSeconds: result.waitSeconds,
					pollCount: result.pollCount ?? game.pollCount,
				},
			});
			for (const entry of auditEntries) {
				await appendGameLog(tx, { gameId, ...entry });
			}
			if (result.trialActorNumber !== undefined) {
				await appendGameLog(tx, {
					gameId,
					type: 'game.trial.started',
					phase: result.nextPhase,
					data: { actorNumber: result.trialActorNumber },
				});
			}
			if (result.trialOver) {
				await appendGameLog(tx, {
					gameId,
					type: 'game.trial.ended',
					phase: game.phase,
					data: { nextPhase: result.nextPhase },
				});
			}
			if (result.deaths && result.deaths.length > 0) {
				await appendGameLog(tx, {
					gameId,
					type: 'game.deaths.announced',
					phase: result.nextPhase,
					data: { deaths: result.deaths },
				});
			}
			if (result.winners && result.winners.length > 0) {
				await appendGameLog(tx, {
					gameId,
					type: 'game.over',
					phase: result.nextPhase,
					data: { winners: result.winners },
				});
			}
			for (const engineLog of result.engineLogs ?? []) {
				const engineLogId = await appendEngineLog(tx, { gameId, ...engineLog });
				const type =
					engineLog.operation === 'resolve'
						? 'game.engine.resolved'
						: engineLog.operation === 'lynch'
							? 'game.lynch.resolved'
							: 'game.engine.win_checked';
				await appendGameLog(tx, {
					gameId,
					type,
					phase: engineLog.phase,
					data: { engineLogId, operation: engineLog.operation, ...engineLog.data },
				});
			}

			await afterTx(async () => {
				const nextPollCount = result.pollCount ?? game.pollCount;

				await realtime.publish(Resource.Realtime, RealtimeEvents.PhaseChange, {
					gameId,
					phase: result.nextPhase,
					duration: result.waitSeconds,
					label: getPhaseLabel(result.nextPhase, nextPollCount),
					sequence: getPhaseSequence(result.nextPhase, nextPollCount),
				});

				if (result.trialActorNumber !== undefined) {
					await realtime.publish(Resource.Realtime, RealtimeEvents.Trial, {
						gameId,
						actorNumber: result.trialActorNumber,
					});
				}

				if (result.trialOver) {
					await realtime.publish(Resource.Realtime, RealtimeEvents.TrialOver, { gameId });
				}

				if (result.lynchResult) {
					await realtime.publish(Resource.Realtime, RealtimeEvents.LynchResult, {
						gameId,
						...result.lynchResult,
					});
				}

				if (result.engineState) {
					await realtime.publish(Resource.Realtime, RealtimeEvents.State, {
						gameId,
						state: result.engineState,
					});
				}

				if (result.deaths && result.deaths.length > 0) {
					await realtime.publish(Resource.Realtime, RealtimeEvents.Deaths, {
						gameId,
						deaths: result.deaths,
					});
				}

				if (result.winners && result.winners.length > 0) {
					await realtime.publish(Resource.Realtime, RealtimeEvents.GameOver, {
						gameId,
						winners: result.winners,
					});
				}
			});

			return {
				gameId,
				continue: result.continue,
				waitSeconds: result.waitSeconds,
				phase: result.nextPhase,
				pollCount: result.pollCount ?? game.pollCount,
			};
		}).catch(async (error) => {
			await recordAdvancePhaseError(gameId, error);
			throw error;
		}),
);
