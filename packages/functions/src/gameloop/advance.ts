import { Game } from '@mafia/core/game/index';
import { z } from 'zod';

const GameLoopInputSchema = z.object({
	gameId: z.string(),
	continue: z.boolean().optional(),
	waitSeconds: z.number().int().optional(),
});

export const handler = async (event: unknown) => {
	const input = GameLoopInputSchema.parse(event);
	console.log('Advance game loop', { event, gameId: input.gameId });

	return Game.advancePhase({ gameId: input.gameId });
};
