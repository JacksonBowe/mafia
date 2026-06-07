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
// ---------------------------------------------------------------------------

export const SetTargetsJsonSchema = z.object({
	targetActorIds: z.array(z.string()),
});
export type SetTargetsJson = z.infer<typeof SetTargetsJsonSchema>;

export const SubmitVoteJsonSchema = z.object({
	targetActorId: z.string(),
});
export type SubmitVoteJson = z.infer<typeof SubmitVoteJsonSchema>;

export const SubmitVerdictJsonSchema = z.object({
	verdict: VerdictSchema,
});
export type SubmitVerdictJson = z.infer<typeof SubmitVerdictJsonSchema>;
