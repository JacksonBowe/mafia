import { and, eq, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';
import { EntityBaseSchema } from '../db/types';
import { useTransaction } from '../db/transaction';
import { InputError, isULID } from '../error';
import { defineRealtimeEvent } from '../realtime';
import { fn } from '../util/fn';
import { gamePlayerTable, gameTable } from './game.sql';

export * as Game from './';

// ---------------------
// Error codes
// ---------------------

export enum Errors {
	GameNotFound = 'game.not_found',
	GameInvalidState = 'game.invalid_state',
	PlayerNotFound = 'game.player_not_found',
	InvalidVoteTarget = 'game.invalid_vote_target',
	CannotVoteSelf = 'game.cannot_vote_self',
	PlayerNotAlive = 'game.player_not_alive',
}

// ---------------------
// Topic helpers
// ---------------------

/**
 * Topic structure for game events:
 * - `game/{gameId}` - Public channel (all players)
 * - `game/{gameId}/actor/{actorId}` - Private channel (per player)
 * - `game/{gameId}/chat/all` - Public chat
 * - `game/{gameId}/chat/{faction}` - Faction chat (e.g., mafia)
 */
export const GameTopics = {
	/** Public game channel - all players receive these events */
	public: (gameId: string) => `game/${gameId}`,
	/** Private actor channel - only the specific player receives these events */
	actor: (gameId: string, actorId: string) => `game/${gameId}/actor/${actorId}`,
	/** Public chat channel */
	chatAll: (gameId: string) => `game/${gameId}/chat/all`,
	/** Faction-specific chat channel */
	chatFaction: (gameId: string, faction: string) => `game/${gameId}/chat/${faction}`,
};

// ---------------------
// Realtime event schemas (for payloads)
// ---------------------

/** Death record for morning announcements */
export const DeathRecordSchema = z.object({
	playerNumber: z.number().int(),
	alias: z.string(),
	role: z.string(),
	deathCause: z.string(),
	deathDay: z.number().int(),
});
export type DeathRecord = z.infer<typeof DeathRecordSchema>;

/** Winner summary for game over */
export const WinnerSummarySchema = z.object({
	faction: z.string(),
	players: z.array(
		z.object({
			playerNumber: z.number().int(),
			alias: z.string(),
			role: z.string(),
		}),
	),
});
export type WinnerSummary = z.infer<typeof WinnerSummarySchema>;

/** Game event for night action results */
export const GameEventSchema = z.object({
	eventId: z.string(),
	message: z.string(),
	duration: z.number().int().default(0),
});
export type GameEvent = z.infer<typeof GameEventSchema>;

// ---------------------
// Realtime events
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
			voter: z.number().int(),
			target: z.number().int(),
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
			voter: z.number().int(),
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
			playerNumber: z.number().int(),
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
			state: z.unknown(), // GameStateInput from engine
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
			voter: z.number().int(),
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
			playerNumber: z.number().int(),
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
			actor: z.unknown(), // ActorState from engine
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
// Schemas
// ---------------------

export const GameStatusSchema = z.enum(['active', 'completed', 'cancelled']);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const GamePhaseSchema = z.enum([
	'pregame', // Role reveal, game setup
	'morning', // Announce deaths from previous night, check win conditions
	'day', // Discussion time
	'poll', // Voting to put someone on trial (up to 3 attempts)
	'defense', // Accused player defends themselves
	'trial', // Jury votes guilty/innocent
	'lynch', // Execute guilty verdict
	'evening', // Resolve day actions, prepare for night
	'night', // Night actions executed
]);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

export const VerdictSchema = z.enum(['guilty', 'innocent']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const GamePlayerSchema = z.object({
	id: isULID(),
	gameId: isULID(),
	userId: z.string(),
	number: z.string(),
	alias: z.string(),
	role: z.string().nullable(),
	vote: z.number().int().nullable(),
	verdict: VerdictSchema.nullable(),
	onTrial: z.boolean(),
});

export type GamePlayer = z.infer<typeof GamePlayerSchema>;

export const GameInfoSchema = EntityBaseSchema.extend({
	status: GameStatusSchema,
	phase: GamePhaseSchema,
	startedAt: z.date(),
	engineState: z.unknown(),
	engineConfig: z.unknown(),
	actors: z.unknown(),
	players: z.array(GamePlayerSchema),
	pollCount: z.number().int(),
});

export type GameInfo = z.infer<typeof GameInfoSchema>;

// ---------------------
// Input schemas
// ---------------------

export const CreateGameInputSchema = z.object({
	engineState: z.unknown(),
	engineConfig: z.unknown(),
	actors: z.unknown(),
	players: z.array(
		z.object({
			userId: z.string(),
			number: z.string(),
			alias: z.string(),
			role: z.string().nullable(),
		}),
	),
});

export type CreateGameInput = z.infer<typeof CreateGameInputSchema>;

// ---------------------
// Core functions
// ---------------------

export const create = fn(CreateGameInputSchema, async (input) =>
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
					number: p.number,
					alias: p.alias,
					role: p.role,
					vote: null,
					verdict: null,
					onTrial: false,
				})),
			);
		}

		return { gameId };
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
		voterNumber: z.number().int().positive(),
		targetNumber: z.number().int().positive(),
	}),
	async ({ gameId, voterNumber, targetNumber }) =>
		useTransaction(async (tx) => {
			// Get the voter's current state
			const [voter] = await tx
				.select()
				.from(gamePlayerTable)
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.number, String(voterNumber)),
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
						eq(gamePlayerTable.number, String(targetNumber)),
					),
				);

			if (!target) {
				throw new InputError(Errors.InvalidVoteTarget, 'Invalid vote target');
			}

			// Cannot vote for yourself
			if (voterNumber === targetNumber) {
				throw new InputError(Errors.CannotVoteSelf, 'Cannot vote for yourself');
			}

			// If already voting for this target, remove the vote (toggle)
			const newVote = voter.vote === targetNumber ? null : targetNumber;

			await tx
				.update(gamePlayerTable)
				.set({ vote: newVote })
				.where(eq(gamePlayerTable.id, voter.id));

			return { vote: newVote };
		}),
);

/**
 * Cancel a player's vote.
 */
export const cancelVote = fn(
	z.object({
		gameId: isULID(),
		voterNumber: z.number().int().positive(),
	}),
	async ({ gameId, voterNumber }) =>
		useTransaction(async (tx) => {
			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ vote: null })
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.number, String(voterNumber)),
					),
				)
				.returning({ id: gamePlayerTable.id });

			if (!updated) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			return { voterNumber };
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
				.set({ vote: null })
				.where(eq(gamePlayerTable.gameId, gameId));

			return { gameId };
		}),
);

/**
 * Tally votes and determine if there's a majority.
 * Returns the player number with majority (>50% of alive players) or null.
 */
export const tallyVotes = fn(
	z.object({
		gameId: isULID(),
		alivePlayers: z.array(z.number().int().positive()),
	}),
	async ({ gameId, alivePlayers }) =>
		useTransaction(async (tx) => {
			// Get all votes from alive players
			const players = await tx
				.select({
					number: gamePlayerTable.number,
					vote: gamePlayerTable.vote,
				})
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			// Count votes only from alive players
			const alivePlayerSet = new Set(alivePlayers.map(String));
			const votes: Record<number, number> = {};

			for (const player of players) {
				if (alivePlayerSet.has(player.number) && player.vote !== null) {
					votes[player.vote] = (votes[player.vote] || 0) + 1;
				}
			}

			// Find the player with the most votes
			let maxVotes = 0;
			let maxVotedPlayer: number | null = null;

			for (const [target, count] of Object.entries(votes)) {
				if (count > maxVotes) {
					maxVotes = count;
					maxVotedPlayer = Number(target);
				}
			}

			// Check for majority (> 50% of alive players)
			const majorityThreshold = Math.floor(alivePlayers.length / 2);
			const hasMajority = maxVotes > majorityThreshold;

			return {
				votes,
				winner: hasMajority ? maxVotedPlayer : null,
				hasMajority,
				totalVotes: Object.values(votes).reduce((sum, count) => sum + count, 0),
				aliveCount: alivePlayers.length,
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
		voterNumber: z.number().int().positive(),
		verdict: VerdictSchema,
	}),
	async ({ gameId, voterNumber, verdict }) =>
		useTransaction(async (tx) => {
			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ verdict })
				.where(
					and(
						eq(gamePlayerTable.gameId, gameId),
						eq(gamePlayerTable.number, String(voterNumber)),
					),
				)
				.returning({ id: gamePlayerTable.id });

			if (!updated) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			return { voterNumber, verdict };
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
		alivePlayers: z.array(z.number().int().positive()),
	}),
	async ({ gameId, alivePlayers }) =>
		useTransaction(async (tx) => {
			const players = await tx
				.select({
					number: gamePlayerTable.number,
					verdict: gamePlayerTable.verdict,
					onTrial: gamePlayerTable.onTrial,
				})
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			// Count verdicts only from alive players who are not on trial
			const alivePlayerSet = new Set(alivePlayers.map(String));
			let guiltyCount = 0;
			let innocentCount = 0;

			for (const player of players) {
				// Skip players on trial (they can't vote)
				if (player.onTrial) continue;

				if (alivePlayerSet.has(player.number) && player.verdict !== null) {
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
		playerNumber: z.number().int().positive(),
	}),
	async ({ gameId, playerNumber }) =>
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
						eq(gamePlayerTable.number, String(playerNumber)),
					),
				)
				.returning({ id: gamePlayerTable.id });

			if (!updated) {
				throw new InputError(Errors.PlayerNotFound, 'Player not found');
			}

			return { playerNumber };
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
