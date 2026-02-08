import { assertActor } from '@mafia/core/actor';
import { Game } from '@mafia/core/game/index';
import { Lobby } from '@mafia/core/lobby/index';
import { Hono } from 'hono';

type Bindings = Record<string, never>;

const adminRoutes = new Hono<{ Bindings: Bindings }>();

adminRoutes.use('*', async (c, next) => {
	const actor = assertActor('user');
	if (!actor.properties.isAdmin) {
		return c.json({ error: 'Unauthorized' }, 403);
	}

	await next();
});

adminRoutes.post('/terminate-lobbies', async (c) => {
	const actor = assertActor('user');
	console.log(actor);

	const lobbies = await Lobby.list();

	await Promise.all(
		lobbies.map(async (lobby) => {
			console.log(
				`Terminating lobby ${lobby.id} (${lobby.name}) by admin ${actor.properties.userId}`,
			);

			await Lobby.terminate({ lobbyId: lobby.id });

			// Delete the lobby
			console.log(`Lobby ${lobby.id} terminated.`);
		}),
	);

	return c.json({ message: 'All lobbies terminated.' });
});

adminRoutes.post('/terminate-games', async (c) => {
	const actor = assertActor('user');
	console.log(actor);

	const games = await Game.list();

	await Promise.all(
		games.map(async (game) => {
			console.log(`Terminating game ${game.id} by admin ${actor.properties.userId}`);
			await Game.terminate({ gameId: game.id });
			console.log(`Game ${game.id} terminated.`);
		}),
	);

	return c.json({ message: 'All games terminated.' });
});

export { adminRoutes };
