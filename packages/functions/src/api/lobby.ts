import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { assertActor } from '@mafia/core/actor';
import { afterTx, createTransaction } from '@mafia/core/db';
import { zValidator } from '@mafia/core/error';
import { Game } from '@mafia/core/game/index';
import { Lobby } from '@mafia/core/lobby/index';
import { realtime } from '@mafia/core/realtime';
import { User } from '@mafia/core/user/index';
import { DEFAULT_CONFIG, newGame, type ActorState } from '@mafia/engine';
import { Hono } from 'hono';
import { Resource } from 'sst';
import {
	CreateLobbyJsonSchema,
	LobbyIdPathParamsSchema,
} from './schemas/lobby.schemas';

type Bindings = Record<string, never>;

const lobbyRoutes = new Hono<{ Bindings: Bindings }>();

// Create
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
lobbyRoutes.get('/:lobbyId', zValidator('param', LobbyIdPathParamsSchema), async (c) => {
	const { lobbyId } = c.req.valid('param');

	const lobby = await Lobby.get({ lobbyId });

	return c.json(lobby);
});

// TODO: Join
lobbyRoutes.post('/:lobbyId/join', zValidator('param', LobbyIdPathParamsSchema), async (c) => {
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

lobbyRoutes.post('/:lobbyId/start', zValidator('param', LobbyIdPathParamsSchema), async (c) => {
	const { lobbyId } = c.req.valid('param');
	const actor = assertActor('user');
	const userId = actor.properties.userId;

	// 1. Validate lobby state and get members
	const lobbyData = await Lobby.prepareForStart({ lobbyId, hostId: userId });

	// 2. Build engine input - use default config, sliced to player count
	// const playerCount = lobbyData.members.length;
	const config = {
		...DEFAULT_CONFIG,
		// tags: DEFAULT_CONFIG.tags.slice(0, playerCount),
	};
	const actors: ActorState[] = lobbyData.members.map((member, index) => ({
		id: crypto.randomUUID(),
		name: member.name,
		alias: generateAlias(index),
		alive: true,
		possibleTargets: [],
		targets: [],
		allies: [],
		roleActions: {},
		alignment: null,
	}));
	const userIdByActorId = new Map(
		actors.map((actor, index) => [actor.id, lobbyData.members[index].userId]),
	);

	// 3. Run engine to create initial game state
	const engineResult = newGame({ actors, config });

	// 4. Persist game and delete lobby atomically
	const { gameId } = await createTransaction(async () => {
		// Create game with engine output
		const { gameId } = await Game.create({
			engineState: engineResult.state,
			engineConfig: config,
			actors: engineResult.actors,
			players: engineResult.actors.map((actor) => ({
				userId: userIdByActorId.get(actor.id) ?? actor.id,
				actorId: actor.id,
				number: actor.number ?? 0,
			})),
		});

		// Publish realtime event after commit
		void afterTx(async () => {
			void realtime.publish(Resource.Realtime, Lobby.RealtimeEvents.LobbyStarted, {
				lobbyId,
				gameId,
			});

			// Invoke the state machine to start the game loop immediately
			const sfnClient = new SFNClient({});
			const response = await sfnClient.send(
				new StartExecutionCommand({
					stateMachineArn: Resource.GameLoopMachine.arn,
					input: JSON.stringify({ gameId, waitSeconds: 15 }),
				}),
			);

			if (response.executionArn) {
				await Game.setGameLoopExecutionArn({ gameId, executionArn: response.executionArn });
			}

			console.log('Started game loop execution', { response });
		});

		// Delete the lobby (cascades to members)
		await Lobby.terminate({ lobbyId });

		return { gameId };
	});

	// Return success without redirect - clients receive realtime event
	return c.json({ success: true, gameId });
});

export { lobbyRoutes };
