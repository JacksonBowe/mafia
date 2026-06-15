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

// Resolve players for a game and build number<->actorId lookups.
// Clients reference other players only by their public number; actor ids stay
// server-side.
async function resolvePlayers(gameId: string, userId: string) {
	const game = await Game.get({ gameId });
	const players = game.players;

	const self = players.find((p) => p.userId === userId);
	if (!self) {
		throw new InputError(GameErrors.PlayerNotFound, 'Player not found in game');
	}

	const actorIdByNumber = new Map(players.map((p) => [p.number, p.actorId]));
	const numberByActorId = new Map(players.map((p) => [p.actorId, p.number]));

	return { self, actorIdByNumber, numberByActorId };
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
		const { targetActorNumbers } = c.req.valid('json');
		const actor = assertActor('user');
		const userId = actor.properties.userId;

		const { actorIdByNumber } = await resolvePlayers(gameId, userId);

		const targetActorIds = targetActorNumbers.map((number) => {
			const actorId = actorIdByNumber.get(number);
			if (!actorId) {
				throw new InputError(GameErrors.InvalidTarget, 'Invalid target');
			}
			return actorId;
		});

		await Game.setTargets({ gameId, userId, targetActorIds });

		return c.json({ gameId, targetActorNumbers });
	},
);

// Submit or toggle a vote during the POLL phase.
gameRoutes.post(
	'/:gameId/vote',
	zValidator('param', GameIdPathParamsSchema),
	zValidator('json', SubmitVoteJsonSchema),
	async (c) => {
		const { gameId } = c.req.valid('param');
		const { targetActorNumber } = c.req.valid('json');
		const actor = assertActor('user');

		const { self, actorIdByNumber, numberByActorId } = await resolvePlayers(
			gameId,
			actor.properties.userId,
		);

		const targetActorId = actorIdByNumber.get(targetActorNumber);
		if (!targetActorId) {
			throw new InputError(GameErrors.InvalidVoteTarget, 'Invalid vote target');
		}

		const { voteTargetActorId } = await Game.submitVote({
			gameId,
			voterActorId: self.actorId,
			targetActorId,
		});

		const voteTargetActorNumber =
			voteTargetActorId !== null ? (numberByActorId.get(voteTargetActorId) ?? null) : null;

		return c.json({ voteTargetActorNumber });
	},
);

// Cancel the current user's vote.
gameRoutes.post(
	'/:gameId/vote/cancel',
	zValidator('param', GameIdPathParamsSchema),
	async (c) => {
		const { gameId } = c.req.valid('param');
		const actor = assertActor('user');

		const { self } = await resolvePlayers(gameId, actor.properties.userId);

		await Game.cancelVote({ gameId, voterActorId: self.actorId });

		return c.json({ success: true });
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

		const { self } = await resolvePlayers(gameId, actor.properties.userId);

		await Game.submitVerdict({ gameId, voterActorId: self.actorId, verdict });

		return c.json({ verdict });
	},
);

export { gameRoutes };
