import { z } from 'zod';
import { isULID } from '@mafia/core/error/schema';
import { VerdictSchema } from '@mafia/core/game/schema';

// ---------------------------------------------------------------------------
// Path Params
// ---------------------------------------------------------------------------

export const GameIdPathParamsSchema = z.object({
	gameId: isULID(),
});
export type GameIdPathParams = z.infer<typeof GameIdPathParamsSchema>;

// ---------------------------------------------------------------------------
// Request Bodies
//
// Clients only know other players by their public number (1-15); actor ids are
// private. The API resolves numbers -> actor ids server-side.
// ---------------------------------------------------------------------------

export const SetTargetsJsonSchema = z.object({
	targetActorNumbers: z.array(z.number().int().positive()),
});
export type SetTargetsJson = z.infer<typeof SetTargetsJsonSchema>;

export const SubmitVoteJsonSchema = z.object({
	targetActorNumber: z.number().int().positive(),
});
export type SubmitVoteJson = z.infer<typeof SubmitVoteJsonSchema>;

export const SubmitVerdictJsonSchema = z.object({
	verdict: VerdictSchema,
});
export type SubmitVerdictJson = z.infer<typeof SubmitVerdictJsonSchema>;
