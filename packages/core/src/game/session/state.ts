import {
	ActorStateSchema,
	GameConfigSchema,
	GameEventGroupDumpSchema,
	GameStateSchema,
	type ActorState,
	type GameConfig,
	type GameState,
} from '@mafia/engine';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTransaction, useTransaction } from '../../db/transaction';
import { InputError, isULID } from '../../error';
import { MessageSchema } from '../../message';
import { fn } from '../../util/fn';
import { gamePlayerTable, gameTable } from '../game.sql';
import { GameErrors, GameStatusSchema } from '../schema';
import { appendGameLog } from './log';
import {
	ClientGameInfoSchema,
	GameSessionErrors as SessionErrors,
	GamePhaseSchema,
	GamePlayerSchema,
	GameSessionInfoSchema,
	type GamePlayer,
	type GameSyncResponse,
} from './schema';

const ActorIdTargetsSchema = z.array(z.string());

export function buildEngineActors(actors: unknown, players: GamePlayer[]): ActorState[] {
	const parsedActors = ActorStateSchema.array().parse(actors);
	const parsedPlayers = GamePlayerSchema.array().parse(players);
	const actorsById = new Map(parsedActors.map((actor) => [actor.id, actor]));
	const targetNumbersByActorId = new Map(
		parsedPlayers.map((player) => [
			player.actorId,
			player.targetActorIds
				.map((targetActorId) => actorsById.get(targetActorId)?.number)
				.filter((number): number is number => number !== undefined),
		]),
	);

	return parsedActors.map((actor) => ({
		...actor,
		targets: targetNumbersByActorId.get(actor.id) ?? [],
	}));
}

export const get = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		useTransaction(async (tx) => {
			const [game] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

			if (!game) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			const players = await tx
				.select()
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			return GameSessionInfoSchema.parse({ ...game, players });
		}),
);

export const updateEvents = fn(
	z.object({
		gameId: isULID(),
		events: GameEventGroupDumpSchema.nullable(),
	}),
	async ({ gameId, events }) =>
		createTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ events })
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const setTargets = fn(
	z.object({
		gameId: isULID(),
		userId: z.string(),
		targetActorIds: ActorIdTargetsSchema,
	}),
	async ({ gameId, userId, targetActorIds }) =>
		createTransaction(async (tx) => {
			const [row] = await tx
				.select({ actors: gameTable.actors, phase: gameTable.phase, status: gameTable.status })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);

			if (!row) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}
			if (row.status !== 'active') {
				throw new InputError(SessionErrors.GameInvalidState, 'Game is not active');
			}
			if (row.phase !== 'evening') {
				throw new InputError(
					SessionErrors.GameInvalidState,
					'Targets can only be set during the evening phase',
				);
			}

			const [player] = await tx
				.select({ actorId: gamePlayerTable.actorId })
				.from(gamePlayerTable)
				.where(and(eq(gamePlayerTable.gameId, gameId), eq(gamePlayerTable.userId, userId)))
				.limit(1);

			if (!player) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
			}

			const actors = ActorStateSchema.array().parse(row.actors);
			const actor = actors.find((item) => item.id === player.actorId);

			if (!actor) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
			}
			if (!actor.alive) {
				throw new InputError(SessionErrors.PlayerNotAlive, 'Player is not alive');
			}
			if (targetActorIds.length !== actor.possibleTargets.length) {
				throw new InputError(SessionErrors.InvalidTarget, 'Invalid target count');
			}

			const numbersByActorId = new Map(actors.map((item) => [item.id, item.number]));

			for (const [index, targetActorId] of targetActorIds.entries()) {
				const targetNumber = numbersByActorId.get(targetActorId);
				const allowed = actor.possibleTargets[index] ?? [];
				if (targetNumber === undefined || !allowed.includes(targetNumber)) {
					throw new InputError(SessionErrors.InvalidTarget, 'Invalid target');
				}
			}

			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ targetActorIds })
				.where(and(eq(gamePlayerTable.gameId, gameId), eq(gamePlayerTable.userId, userId)))
				.returning({ id: gamePlayerTable.id });

			if (!updated) {
				throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.targets.set',
				phase: GamePhaseSchema.parse(row.phase),
				actorId: player.actorId,
				data: {
					actorNumber: actor.number ?? null,
					targetActorIds,
					targetActorNumbers: targetActorIds.map(
						(id) => numbersByActorId.get(id) ?? null,
					),
				},
			});

			return { gameId, userId, targetActorIds };
		}),
);

export const clearTargets = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		createTransaction(async (tx) => {
			await tx
				.update(gamePlayerTable)
				.set({ targetActorIds: [] })
				.where(eq(gamePlayerTable.gameId, gameId));

			return { gameId };
		}),
);

export const recordChatMessage = fn(
	z.object({
		gameId: isULID(),
		actorId: z.string(),
		message: MessageSchema,
	}),
	async ({ gameId, actorId, message }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({ phase: gameTable.phase })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);
			if (!game) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.chat.sent',
				phase: GamePhaseSchema.parse(game.phase),
				actorId,
				data: { message },
			});
			return { gameId, messageId: message.id };
		}),
);

/**
 * Build a game sync payload for a specific user.
 * Finds the user's active game, extracts public state, config, and their private actor.
 */
export const sync = fn(z.object({ userId: z.string() }), async ({ userId }) =>
	useTransaction(async (tx) => {
		// Find the player's active game
		const [playerRow] = await tx
			.select({
				gameId: gamePlayerTable.gameId,
				actorId: gamePlayerTable.actorId,
			})
			.from(gamePlayerTable)
			.innerJoin(gameTable, eq(gameTable.id, gamePlayerTable.gameId))
			.where(and(eq(gamePlayerTable.userId, userId), eq(gameTable.status, 'active')))
			.limit(1);

		if (!playerRow) {
			return null;
		}

		const { gameId } = playerRow;

		// Fetch game record
		const [game] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

		if (!game) {
			throw new InputError(GameErrors.GameNotFound, 'Game not found');
		}

		// Parse engine state and config — schemas re-exported from engine (source of truth)
		const state: GameState = GameStateSchema.parse(game.engineState);

		const config: GameConfig = GameConfigSchema.parse(game.engineConfig);

		// Extract the requesting user's actor from the actors array
		const actors = (game.actors ?? []) as ActorState[];

		const rawActor = actors.find((a) => a.id === playerRow.actorId);

		if (!rawActor) {
			throw new InputError(SessionErrors.PlayerNotFound, 'Actor not found for player');
		}

		const myActor: ActorState = ActorStateSchema.parse(rawActor);

		// Phase-scoped vote tally (voter number -> target number). Votes only
		// matter during the poll phase, so surface an empty map otherwise to
		// avoid showing stale votes on reload / late-join.
		const votes: Record<number, number> = {};
		if (game.phase === 'poll') {
			const players = await tx
				.select({
					number: gamePlayerTable.number,
					actorId: gamePlayerTable.actorId,
					voteTargetActorId: gamePlayerTable.voteTargetActorId,
				})
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			const numberByActorId = new Map(players.map((p) => [p.actorId, p.number]));
			for (const player of players) {
				if (player.voteTargetActorId === null) continue;
				const targetNumber = numberByActorId.get(player.voteTargetActorId);
				if (targetNumber !== undefined) {
					votes[player.number] = targetNumber;
				}
			}
		}

		const info = ClientGameInfoSchema.parse({
			id: gameId,
			status: game.status,
			phase: game.phase,
			pollCount: game.pollCount,
			syncTs: game.updatedAt.getTime(),
		});

		return { info, state, config, actor: myActor, votes } satisfies GameSyncResponse;
	}),
);

export const updateState = fn(
	z.object({
		gameId: isULID(),
		engineState: z.unknown(),
		actors: z.unknown(),
		phase: GamePhaseSchema.optional(),
		status: GameStatusSchema.optional(),
	}),
	async ({ gameId, engineState, actors, phase, status }) =>
		createTransaction(async (tx) => {
			const updates: Record<string, unknown> = {
				engineState,
				actors,
			};

			if (phase) updates.phase = phase;
			if (status) updates.status = status;

			const [updated] = await tx
				.update(gameTable)
				.set(updates)
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const setGameLoopExecutionArn = fn(
	z.object({
		gameId: isULID(),
		executionArn: z.string().min(1),
	}),
	async ({ gameId, executionArn }) =>
		createTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ gameLoopExecutionArn: executionArn })
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const getByPlayer = fn(
	z.object({
		userId: z.string(),
	}),
	async ({ userId }) =>
		useTransaction(async (tx) => {
			// Find the player's active game
			const [playerGame] = await tx
				.select({
					gameId: gamePlayerTable.gameId,
				})
				.from(gamePlayerTable)
				.innerJoin(gameTable, eq(gameTable.id, gamePlayerTable.gameId))
				.where(and(eq(gamePlayerTable.userId, userId), eq(gameTable.status, 'active')))
				.limit(1);

			if (!playerGame) {
				return null;
			}

			return get({ gameId: playerGame.gameId });
		}),
);
