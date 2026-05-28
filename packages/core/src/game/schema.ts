// ---------------------------------------------------------------------------
// Pure game contracts shared with the SDK.
// Must NOT import any infra (sst, hono, drizzle, aws, neondatabase, ws).
// ---------------------------------------------------------------------------
import {
	ActorStateSchema,
	GameConfigSchema,
	GameStateSchema,
	type ActorState,
	type GameConfig,
	type GameState,
} from '@mafia/engine';
import { z } from 'zod';
import { EntityBaseSchema } from '../db/schema';
import { isULID } from '../error/schema';

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export enum GameErrors {
	GameNotFound = 'game.not_found',
	GameInvalidState = 'game.invalid_state',
	PlayerNotFound = 'game.player_not_found',
	InvalidVoteTarget = 'game.invalid_vote_target',
	CannotVoteSelf = 'game.cannot_vote_self',
	PlayerNotAlive = 'game.player_not_alive',
}

// ---------------------------------------------------------------------------
// Topic helpers (pure string builders — safe in browser)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Realtime payload schemas
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Status / phase / verdict
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Player & game info
// ---------------------------------------------------------------------------

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
	engineState: GameStateSchema,
	engineConfig: GameConfigSchema,
	actors: z.unknown(),
	players: z.array(GamePlayerSchema),
	pollCount: z.number().int(),
});

export type GameInfo = z.infer<typeof GameInfoSchema>;

// ---------------------------------------------------------------------------
// Client sync types
// ---------------------------------------------------------------------------

/** Metadata about the game visible to all players */
export const ClientGameInfoSchema = z.object({
	id: z.string(),
	status: GameStatusSchema,
	phase: GamePhaseSchema,
	pollCount: z.number().int(),
	/** Server-authoritative timestamp (ms since epoch) for ordering sync responses */
	syncTs: z.number(),
});
export type ClientGameInfo = z.infer<typeof ClientGameInfoSchema>;

/** Full sync response returned by GET /game */
export interface GameSyncResponse {
	info: ClientGameInfo;
	state: GameState;
	config: GameConfig;
	actor: ActorState;
}

export const GameSyncResponseSchema = z.object({
	info: ClientGameInfoSchema,
	state: GameStateSchema,
	config: GameConfigSchema,
	actor: ActorStateSchema,
});

// Re-export engine types so consumers don't need to import from @mafia/engine directly.
export type { ActorState, GameConfig, GameState } from '@mafia/engine';
