import { assertActor } from '@mafia/core/actor';
import { isULID, zValidator } from '@mafia/core/error';
import { Game } from '@mafia/core/game/index';
import { Hono } from 'hono';
import { z } from 'zod';

type Bindings = Record<string, never>;

const gameRoutes = new Hono<{ Bindings: Bindings }>();

// Get game by ID
export const GetGameParamsSchema = z.object({ gameId: isULID() });

gameRoutes.get('/:gameId', zValidator('param', GetGameParamsSchema), async (c) => {
	const { gameId } = c.req.valid('param');

	const game = await Game.get({ gameId });

	return c.json(game);
});

// Get current user's active game
gameRoutes.get('/me/active', async (c) => {
	const actor = assertActor('user');
	const userId = actor.properties.userId;

	const game = await Game.getByPlayer({ userId });

	if (!game) {
		return c.json({ game: null });
	}

	return c.json({ game });
});

export { gameRoutes };
