import { assertActor } from '@mafia/core/actor';
import { Game } from '@mafia/core/game/index';
import { Hono } from 'hono';

type Bindings = Record<string, never>;

const gameRoutes = new Hono<{ Bindings: Bindings }>();

// Fetch the current user's active game (info, state, config, actor)
gameRoutes.get('/', async (c) => {
	const actor = assertActor('user');
	const userId = actor.properties.userId;

	const data = await Game.sync({ userId });

	if (!data) {
		return c.json(null);
	}

	return c.json(data);
});

export { gameRoutes };
