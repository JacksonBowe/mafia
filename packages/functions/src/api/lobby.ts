import { assertActor } from '@mafia/core/actor';
import { afterTx, createTransaction } from '@mafia/core/db';
import { isULID, zValidator } from '@mafia/core/error';
import { Game } from '@mafia/core/game/index';
import { Lobby } from '@mafia/core/lobby/index';
import { realtime } from '@mafia/core/realtime';
import { User } from '@mafia/core/user/index';
import { DEFAULT_CONFIG, newGame, type PlayerInput } from '@mafia/engine';
import { Hono } from 'hono';
import { Resource } from 'sst';
import { z } from 'zod';

type Bindings = {};

const lobbyRoutes = new Hono<{ Bindings: Bindings }>();

// Create
export const CreateLobbyJsonSchema = z.object({ name: z.string().min(3).max(50) });
export type CreateLobbyJson = z.infer<typeof CreateLobbyJsonSchema>;

lobbyRoutes.post('/', zValidator('json', CreateLobbyJsonSchema), async (c) => {
	const { name } = c.req.valid('json');

	const actor = assertActor('user');
	const lobby = await Lobby.create({
		hostId: actor.properties.userId,
		name,
		config: {},
	});

	return c.json(lobby);
});

// List
lobbyRoutes.get('/', async (c) => {
	const lobbies = await Lobby.list();
	return c.json(lobbies);
});

// Get
export const GetLobbyParamsSchema = z.object({ lobbyId: isULID() });
lobbyRoutes.get('/:lobbyId', zValidator('param', GetLobbyParamsSchema), async (c) => {
	const { lobbyId } = c.req.valid('param');

	const lobby = await Lobby.get({ lobbyId });

	return c.json(lobby);
});

// TODO: Join
export const JoinLobbyParamsSchema = z.object({
	lobbyId: isULID(),
});

export type JoinLobbyParams = z.infer<typeof JoinLobbyParamsSchema>;

lobbyRoutes.post('/:lobbyId/join', zValidator('param', JoinLobbyParamsSchema), async (c) => {
	const { lobbyId } = c.req.valid('param');

	const actor = assertActor('user');

	await Lobby.Member.add({ lobbyId, userId: actor.properties.userId });

	return c.json({ success: true });
});

// TODO: Leave
lobbyRoutes.post('/leave', async (c) => {
	const actor = assertActor('user');
	const presence = await User.getPresence({ userId: actor.properties.userId });

	if (!presence.lobby) {
		return c.json({ success: true });
	}

	await Lobby.Member.remove({ lobbyId: presence.lobby?.id, userId: actor.properties.userId });
	return c.json({ success: true });
});

// Start game
export const StartLobbyParamsSchema = z.object({
	lobbyId: isULID(),
});

// Generate a random alias for a player
const generateAlias = (index: number): string => {
	const adjectives = [
		'Swift',
		'Silent',
		'Clever',
		'Bold',
		'Sly',
		'Keen',
		'Sharp',
		'Quick',
		'Brave',
		'Wise',
		'Dark',
		'Bright',
		'Cool',
		'Calm',
		'Wild',
	];
	const nouns = [
		'Fox',
		'Wolf',
		'Hawk',
		'Bear',
		'Lion',
		'Eagle',
		'Raven',
		'Tiger',
		'Viper',
		'Falcon',
		'Shadow',
		'Storm',
		'Blade',
		'Ghost',
		'Flame',
	];
	// Use index to pick deterministically, but in a way that looks random
	const adj = adjectives[index % adjectives.length];
	const noun = nouns[(index * 7) % nouns.length];
	return `${adj}${noun}`;
};

lobbyRoutes.post('/:lobbyId/start', zValidator('param', StartLobbyParamsSchema), async (c) => {
	const { lobbyId } = c.req.valid('param');
	const actor = assertActor('user');
	const userId = actor.properties.userId;

	// 1. Validate lobby state and get members
	const lobbyData = await Lobby.prepareForStart({ lobbyId, hostId: userId });

	// 2. Build engine input - use default config, sliced to player count
	const playerCount = lobbyData.members.length;
	const config = {
		...DEFAULT_CONFIG,
		tags: DEFAULT_CONFIG.tags.slice(0, playerCount),
	};
	const players: PlayerInput[] = lobbyData.members.map((member, index) => ({
		id: member.userId,
		name: member.name,
		alias: generateAlias(index),
		alive: true,
		possibleTargets: [],
		targets: [],
		allies: [],
		roleActions: {},
	}));

	// 3. Run engine to create initial game state
	const engineResult = newGame({ players, config });

	// 4. Persist game and delete lobby atomically
	const { gameId } = await createTransaction(async () => {
		// Create game with engine output
		const { gameId } = await Game.create({
			engineState: engineResult.state,
			engineConfig: config,
			actors: engineResult.actors,
			players: engineResult.actors.map((actor) => ({
				userId: actor.id,
				number: String(actor.number ?? 0),
				alias: actor.alias,
				role: actor.role ?? null,
			})),
		});

		// Publish realtime event after commit
		afterTx(() => {
			realtime.publish(Resource.Realtime, Lobby.RealtimeEvents.LobbyStarted, {
				lobbyId,
				gameId,
			});
		});

		// Delete the lobby (cascades to members)
		await Lobby.terminate({ lobbyId });

		return { gameId };
	});

	// Return success without redirect - clients receive realtime event
	return c.json({ success: true, gameId });
});

export { lobbyRoutes };
