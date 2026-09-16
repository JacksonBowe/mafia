import { SFNClient, StopExecutionCommand } from '@aws-sdk/client-sfn';
import { and, asc, desc, eq, gt, lt, type SQL } from 'drizzle-orm';
import { Resource } from 'sst';
import { ulid } from 'ulid';
import { z } from 'zod';
import type { Page } from '../db/schema';
import { afterTx, createTransaction, useTransaction } from '../db/transaction';
import { InputError, isULID, UnhandledServerError } from '../error';
import { realtime } from '../realtime';
import { fn } from '../util/fn';
import { gamePlayerTable, gameTable } from './game.sql';
import {
	CreateGameInputSchema,
	GameErrors as Errors,
	GameInfoSchema,
	GameStatusSchema,
} from './schema';
import * as Session from './session';

export * from './session';
export { Session };
export { Realtime } from './session/events';

export const create = fn(CreateGameInputSchema, async (input) =>
	createTransaction(async (tx) => {
		const gameId = ulid();

		// Insert game record
		await tx.insert(gameTable).values({
			id: gameId,
			status: 'active',
			phase: 'pregame',
			pollCount: 0,
			engineState: input.engineState,
			engineConfig: input.engineConfig,
			actors: input.actors,
		});

		// Insert game players
		if (input.players.length > 0) {
			await tx.insert(gamePlayerTable).values(
				input.players.map((p) => ({
					id: ulid(),
					gameId,
					userId: p.userId,
					actorId: p.actorId,
					number: p.number,
					voteTargetActorId: null,
					verdict: null,
					onTrial: false,
					targetActorIds: [],
				})),
			);
		}

		await Session.Log.appendGameLog(tx, {
			gameId,
			type: 'game.started',
			phase: 'pregame',
			data: {
				// TODO: Store immutable player name and alias snapshots for direct audit review.
				players: input.players,
				config: input.engineConfig,
			},
		});
		await Session.Log.appendEngineLog(tx, {
			gameId,
			operation: 'new-game',
			phase: 'pregame',
			data: { actorCount: input.players.length },
			lines: input.engineLog,
		});

		return { gameId };
	}),
);

export const get = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		useTransaction(async (tx) => {
			const [game] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

			if (!game) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			return GameInfoSchema.parse(game);
		}),
);

const GameListOrderSchema = z.enum(['asc', 'desc']);
const ListGamesInputSchema = z
	.object({
		limit: z.number().int().min(1).max(100).default(10),
		cursor: isULID().optional(),
		order: GameListOrderSchema.default('desc'),
		status: GameStatusSchema.optional(),
	})
	.optional();

/** Lists games in deterministic ULID order for operational queries. */
export const list = fn(ListGamesInputSchema, async (input) => {
	const { limit = 10, cursor, order = 'desc', status } = input ?? {};

	let rows;
	try {
		rows = await useTransaction((tx) => {
			const filters: SQL[] = [];
			if (status) filters.push(eq(gameTable.status, status));
			if (cursor)
				filters.push(
					order === 'desc' ? lt(gameTable.id, cursor) : gt(gameTable.id, cursor),
				);

			const whereExpr: SQL | undefined = filters.length ? and(...filters) : undefined;

			return tx
				.select({
					id: gameTable.id,
					status: gameTable.status,
					phase: gameTable.phase,
					createdAt: gameTable.createdAt,
					updatedAt: gameTable.updatedAt,
					startedAt: gameTable.startedAt,
				})
				.from(gameTable)
				.where(whereExpr)
				.orderBy(order === 'desc' ? desc(gameTable.id) : asc(gameTable.id))
				.limit(limit + 1);
		});
	} catch (error) {
		console.error('Database error during game list:', { originalError: error });
		throw new UnhandledServerError('An unexpected database error occurred during game list.');
	}

	const hasMore = rows.length > limit;
	const items = hasMore ? rows.slice(0, limit) : rows;

	return {
		items,
		meta: {
			limit,
			hasMore,
			nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
		},
	} satisfies Page<(typeof items)[number]>;
});

export const terminate = fn(
	z.object({
		gameId: isULID(),
		terminatedByUserId: z.string().optional(),
		reason: z.string().min(1).optional(),
	}),
	async ({ gameId, terminatedByUserId, reason }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({
					id: gameTable.id,
					status: gameTable.status,
					phase: gameTable.phase,
					gameLoopExecutionArn: gameTable.gameLoopExecutionArn,
				})
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);

			if (!game) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}
			if (game.status !== 'active') {
				throw new InputError(Session.Errors.GameInvalidState, 'Game is not active');
			}

			await Session.Log.appendGameLog(tx, {
				gameId,
				type: 'game.terminated',
				phase: Session.Schema.GamePhaseSchema.parse(game.phase),
				data: {
					reason: reason ?? 'terminated',
					terminatedByUserId: terminatedByUserId ?? null,
				},
			});

			const [cancelled] = await tx
				.update(gameTable)
				.set({ status: 'cancelled' })
				.where(and(eq(gameTable.id, gameId), eq(gameTable.status, 'active')))
				.returning({ id: gameTable.id });

			if (!cancelled) {
				throw new InputError(Session.Errors.GameInvalidState, 'Game is not active');
			}

			await afterTx(async () => {
				if (game.gameLoopExecutionArn) {
					const sfnClient = new SFNClient({});

					try {
						await sfnClient.send(
							new StopExecutionCommand({
								executionArn: game.gameLoopExecutionArn,
							}),
						);
					} catch (error) {
						console.error('Failed to stop game loop execution', { gameId, error });
					}
				}

				await realtime.publish(Resource.Realtime, Session.Events.Realtime.Terminated, {
					gameId,
					message: reason ?? 'Game terminated',
				});
			});

			return { gameId };
		}),
);
