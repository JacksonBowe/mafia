import { z } from 'zod';
import { isULID } from '@mafia/core/error/schema';

// ---------------------------------------------------------------------------
// Path Params
// ---------------------------------------------------------------------------

export const LobbyIdPathParamsSchema = z.object({
	lobbyId: isULID(),
});
export type LobbyIdPathParams = z.infer<typeof LobbyIdPathParamsSchema>;

// ---------------------------------------------------------------------------
// Request Bodies
// ---------------------------------------------------------------------------

export const CreateLobbyJsonSchema = z.object({
	name: z.string().min(3).max(50),
});
export type CreateLobbyJson = z.infer<typeof CreateLobbyJsonSchema>;
