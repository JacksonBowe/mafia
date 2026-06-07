import type { ActorState, GameConfig, GameState } from '@mafia/engine';
import { ActorStateSchema, GameConfigSchema, GameStateSchema } from '@mafia/engine';
import { and, eq, sql } from 'drizzle-orm';
import { Resource } from 'sst';
import { ulid } from 'ulid';
import { z } from 'zod';
import { afterTx, useTransaction } from '../db/transaction';
import { InputError, isULID } from '../error';
import { defineRealtimeEvent, realtime } from '../realtime';
import { fn } from '../util/fn';
import { gamePlayerTable, gameTable } from './game.sql';
import {
	ClientGameInfoSchema,
	DeathRecordSchema,
	GameErrors as Errors,
	GameEventSchema,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics,
	VerdictSchema,
	WinnerSummarySchema,
	type GamePlayer,
	type GameSyncResponse,
} from './schema';

export * as Game from './';

// Re-export pure contracts for backend convenience.
export type {
	ActorState,
	ClientGameInfo,
	DeathRecord,
	GameConfig,
	GameEvent,
	GameInfo,
	GamePhase,
	GamePlayer,
	GameState,
	GameStatus,
	GameSyncResponse,
	Verdict,
	WinnerSummary
} from './schema';
export {
	ClientGameInfoSchema,
	DeathRecordSchema,
	Errors,
	GameEventSchema,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics,
	VerdictSchema,
	WinnerSummarySchema
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
			voterActorId: z.string(),
			targetActorId: z.string(),
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
			voterActorId: z.string(),
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
			actorId: z.string(),
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
			deaths: z.array(DeathRecordSchema),
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
			voterActorId: z.string(),
			verdict: z.enum(['guilty', 'innocent']),
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

export const create = fn(z.object({
	engineState: z.unknown(),
	engineConfig: z.unknown(),
	actors: z.unknown(),
	players: z.array(
		z.object({
			userId: z.string(),
			actorId: z.string(),
			number: z.number().int().positive(),
		}),
	),
}), async (input) =>
	useTransaction(async (tx) => {
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
		events: z.unknown().nullable(),
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
		useTransaction(async (tx) => {
			const [row] = await tx
				.select({ actors: gameTable.actors })
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

		const info = ClientGameInfoSchema.parse({
			id: gameId,
			status: game.status,
			phase: game.phase,
			pollCount: game.pollCount,
			syncTs: game.updatedAt.getTime(),
		});

		return { info, state, config, actor: myActor } satisfies GameSyncResponse;
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
		useTransaction(async (tx) => {
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
			const voteTargetActorId = voter.voteTargetActorId === targetActorId ? null : targetActorId;

			await tx
				.update(gamePlayerTable)
				.set({ voteTargetActorId })
				.where(eq(gamePlayerTable.id, voter.id));

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
		useTransaction(async (tx) => {
			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ voteTargetActorId: null })
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, voterActorId),
					),
				)
				.returning({ id: gamePlayerTable.id });

			if (!updated) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

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
 * Submit a player's trial verdict (guilty/innocent).
 */
export const submitVerdict = fn(
	z.object({
		gameId: isULID(),
		voterActorId: z.string(),
		verdict: VerdictSchema,
	}),
	async ({ gameId, voterActorId, verdict }) =>
		useTransaction(async (tx) => {
			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ verdict })
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, voterActorId),
					),
				)
				.returning({ id: gamePlayerTable.id });

			if (!updated) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

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

			// Count verdicts only from alive players who are not on trial
			const aliveActorIdSet = new Set(aliveActorIds);
			let guiltyCount = 0;
			let innocentCount = 0;

			for (const player of players) {
				// Skip players on trial (they can't vote)
				if (player.onTrial) continue;

				if (aliveActorIdSet.has(player.actorId) && player.verdict !== null) {
					if (player.verdict === 'guilty') {
						guiltyCount++;
					} else {
						innocentCount++;
					}
				}
			}

			// Guilty wins only if guilty > innocent (tie goes to innocent)
			const isGuilty = guiltyCount > innocentCount;

			return {
				guiltyCount,
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
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.actorId, actorId),
					),
				)
				.returning({ id: gamePlayerTable.id });

			if (!updated) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

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

export const list = () =>
	useTransaction(async (tx) =>
		tx
			.select({
				id: gameTable.id,
				status: gameTable.status,
				createdAt: gameTable.createdAt,
			})
			.from(gameTable),
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
				.where(eq(gamePlayerTable.userId, userId))
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
	}),
	async ({ gameId }) =>
		useTransaction(async (tx) => {
			const [game] = await tx
				.select({ id: gameTable.id })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);

			if (!game) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			const deleted = await tx
				.delete(gameTable)
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (deleted.length === 0) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const advancePhase = fn(
	z.object({
		gameId: isULID(),
		pollCount: z.number().int().optional(),
	}),
	async ({ gameId, pollCount }) => {
		console.log('Advance phase for game', { gameId, pollCount });

		const game = await get({ gameId });

		if (game.status !== 'active') {
			return { gameId, continue: false, waitSeconds: 0, phase: game.phase, pollCount };
		}

		const result = (() => {
			switch (game.phase) {
				case 'pregame':
					return {
						nextPhase: 'day' as const,
						waitSeconds: 10,
						continue: true,
					};

				case 'day':
					if (game.engineState.day === 1) {
						return {
							nextPhase: 'evening' as const,
							waitSeconds: 10,
							continue: true,
						}
					}
					return {
						nextPhase: 'poll' as const,
						waitSeconds: 10,
						continue: true,
					};

				case 'poll':
					return {
						nextPhase: 'defense' as const,
						waitSeconds: 10,
						continue: true,
					};

				case 'defense':
					return {
						nextPhase: 'trial' as const,
						waitSeconds: 10,
						continue: true,
					};

				case 'trial':
					return {
						nextPhase: 'lynch' as const,
						waitSeconds: 10,
						continue: true,
					};

				case 'lynch':
					return {
						nextPhase: 'evening' as const,
						waitSeconds: 10,
						continue: true,
					};

				case 'evening':
					return {
						nextPhase: 'night' as const,
						waitSeconds: 10,
						continue: true,
					};

				case 'night':
					return {
						nextPhase: 'morning' as const,
						waitSeconds: 0,
						continue: false,
					};

				case 'morning':
					return {
						nextPhase: 'morning' as const,
						waitSeconds: 0,
						continue: false,
					};

				default:
					throw new InputError(Errors.GameInvalidState, 'Invalid game phase');
			}
		})();

		if (result.nextPhase !== game.phase) {
			await useTransaction(async (tx) => {
				const [updated] = await tx
					.update(gameTable)
					.set({ phase: result.nextPhase })
					.where(eq(gameTable.id, gameId))
					.returning({ id: gameTable.id });

				if (!updated) {
					throw new InputError(Errors.GameNotFound, 'Game not found');
				}

				afterTx(async () => {
					void realtime.publish(Resource.Realtime, RealtimeEvents.PhaseChange, {
						gameId,
						phase: result.nextPhase,
						duration: result.waitSeconds,
					});

				})
			});
		}

		return {
			gameId,
			continue: result.continue,
			waitSeconds: result.waitSeconds,
			phase: result.nextPhase,
			pollCount,
		};
	},
);
