// ---------------------------------------------------------------------------
// Pure lobby contracts shared with the SDK.
// Must NOT import any infra (sst, hono, drizzle, aws, neondatabase, ws).
// ---------------------------------------------------------------------------
import { z } from 'zod';
import { EntityBaseSchema, RelatedEntitySchema } from '../db/schema';
import { isULID } from '../error/schema';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 15;

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export enum LobbyErrors {
	LobbyExists = 'lobby.exists',
	LobbyDuplicateHost = 'lobby.duplicate_host',
	LobbyNotFound = 'lobby.not_found',
	LobbyDeleteFailed = 'lobby.delete_failed',
	LobbyHostRequired = 'lobby.host_required',
	LobbyInsufficientPlayers = 'lobby.insufficient_players',
	LobbyTooManyPlayers = 'lobby.too_many_players',
}

// ---------------------------------------------------------------------------
// Lobby info
// ---------------------------------------------------------------------------

export const LobbyInfoSchema = EntityBaseSchema.extend({
	name: z.string(),
	host: RelatedEntitySchema,
	config: z.object({}).passthrough(),
	members: z.array(RelatedEntitySchema),
});

export type LobbyInfo = z.infer<typeof LobbyInfoSchema>;

// ---------------------------------------------------------------------------
// Lobby member info
// ---------------------------------------------------------------------------

export const LobbyMemberInfoSchema = EntityBaseSchema.extend({
	lobbyId: isULID(),
	userId: isULID(),
});

export type LobbyMemberInfo = z.infer<typeof LobbyMemberInfoSchema>;

export enum LobbyMemberErrors {
	LobbyMemberNotFound = 'lobby.member.not_found',
}
