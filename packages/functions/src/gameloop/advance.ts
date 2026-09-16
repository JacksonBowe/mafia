import { Game } from '@mafia/core/game/index';
import { z } from 'zod';

const GameLoopInputSchema = z.object({
	gameId: z.string(),
	executionId: z.string().min(1),
	expectedPhaseVersion: z.number().int().nonnegative(),
	continue: z.boolean().optional(),
	waitSeconds: z.number().int().optional(),
});

export const handler = async (event: unknown) => {
	const input = GameLoopInputSchema.parse(event);
	console.log('Advance game loop', { event, gameId: input.gameId });

	const result = await Game.Session.Phase.advancePhase({
		gameId: input.gameId,
		expectedPhaseVersion: input.expectedPhaseVersion,
		idempotencyKey: `${input.executionId}:${input.expectedPhaseVersion}`,
	});

	return {
		...result,
		executionId: input.executionId,
		expectedPhaseVersion: result.phaseVersion,
	};
};
