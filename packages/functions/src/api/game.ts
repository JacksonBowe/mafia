import { assertActor } from '@mafia/core/actor';
import { InputError, zValidator } from '@mafia/core/error';
import { Game } from '@mafia/core/game/index';
import { GameErrors } from '@mafia/core/game/schema';
import { Hono } from 'hono';
import {
	GameIdPathParamsSchema,
	SetTargetsJsonSchema,
	SubmitVerdictJsonSchema,
	SubmitVoteJsonSchema,
} from './schemas/game.schemas';

type Bindings = Record<string, never>;

const gameRoutes = new Hono<{ Bindings: Bindings }>();

// Resolve the requesting user's actor id within a game.
async function resolveActorId(gameId: string, userId: string): Promise<string> {
	const game = await Game.get({ gameId });
	const player = game.players.find((p) => p.userId === userId);

	if (!player) {
		throw new InputError(GameErrors.PlayerNotFound, 'Player not found in game');
	}

	return player.actorId;
}

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

// Set night action targets for the current user.
gameRoutes.post(
	'/:gameId/targets',
	zValidator('param', GameIdPathParamsSchema),
	zValidator('json', SetTargetsJsonSchema),
	async (c) => {
		const { gameId } = c.req.valid('param');
		const { targetActorIds } = c.req.valid('json');
		const actor = assertActor('user');
		const userId = actor.properties.userId;

		const result = await Game.setTargets({ gameId, userId, targetActorIds });

		return c.json(result);
	},
);

// Submit or toggle a vote during the POLL phase.
gameRoutes.post(
	'/:gameId/vote',
	zValidator('param', GameIdPathParamsSchema),
	zValidator('json', SubmitVoteJsonSchema),
	async (c) => {
		const { gameId } = c.req.valid('param');
		const { targetActorId } = c.req.valid('json');
		const actor = assertActor('user');
		const voterActorId = await resolveActorId(gameId, actor.properties.userId);

		const result = await Game.submitVote({ gameId, voterActorId, targetActorId });

		return c.json(result);
	},
);

// Cancel the current user's vote.
gameRoutes.post(
	'/:gameId/vote/cancel',
	zValidator('param', GameIdPathParamsSchema),
	async (c) => {
		const { gameId } = c.req.valid('param');
		const actor = assertActor('user');
		const voterActorId = await resolveActorId(gameId, actor.properties.userId);

		const result = await Game.cancelVote({ gameId, voterActorId });

		return c.json(result);
	},
);

// Submit a guilty/innocent verdict during the TRIAL phase.
gameRoutes.post(
	'/:gameId/verdict',
	zValidator('param', GameIdPathParamsSchema),
	zValidator('json', SubmitVerdictJsonSchema),
	async (c) => {
		const { gameId } = c.req.valid('param');
		const { verdict } = c.req.valid('json');
		const actor = assertActor('user');
		const voterActorId = await resolveActorId(gameId, actor.properties.userId);

		const result = await Game.submitVerdict({ gameId, voterActorId, verdict });

		return c.json(result);
	},
);

export { gameRoutes };
