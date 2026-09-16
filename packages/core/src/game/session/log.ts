import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';
import type { Page } from '../../db/schema';
import { type TxOrDb, useTransaction } from '../../db/transaction';
import { InputError, isULID } from '../../error';
import { fn } from '../../util/fn';
import { engineLogTable, gameLogTable, gameTable } from '../game.sql';
import * as Assert from './assert';
import { GamePhaseSchema, GameSessionErrors } from './schema';

export const GameLogTypeSchema = z.enum([
	'game.started',
	'game.phase.entered',
	'game.chat.sent',
	'game.targets.set',
	'game.vote.cast',
	'game.vote.cancelled',
	'game.poll.tallied',
	'game.trial.started',
	'game.trial.ended',
	'game.verdict.submitted',
	'game.verdict.tallied',
	'game.lynch.resolved',
	'game.engine.resolved',
	'game.engine.win_checked',
	'game.deaths.announced',
	'game.over',
	'game.terminated',
	'game.error',
]);
export type GameLogType = z.infer<typeof GameLogTypeSchema>;

export const EngineLogOperationSchema = z.enum(['new-game', 'resolve', 'lynch', 'load-win-check']);
export type EngineLogOperation = z.infer<typeof EngineLogOperationSchema>;

export type GameLogInput = {
	gameId: string;
	type: GameLogType;
	phase?: z.infer<typeof GamePhaseSchema>;
	actorId?: string;
	data: Record<string, unknown>;
};

export type EngineLogInput = {
	gameId: string;
	operation: EngineLogOperation;
	phase?: z.infer<typeof GamePhaseSchema>;
	data: Record<string, unknown>;
	lines: string[];
};

const ListGameLogsInputSchema = z.object({
	gameId: isULID(),
	cursor: isULID().optional(),
	limit: z.number().int().min(1).max(500).default(100),
});
const ListEngineLogsInputSchema = z.object({
	gameId: isULID(),
	cursor: isULID().optional(),
	limit: z.number().int().min(1).max(500).default(100),
});

export const GameLogEntrySchema = z.object({
	id: isULID(),
	gameId: isULID(),
	createdAt: z.date(),
	type: GameLogTypeSchema,
	phase: GamePhaseSchema.nullable(),
	actorId: z.string().nullable(),
	sequence: z.number().int().positive(),
	data: z.record(z.string(), z.unknown()),
});
export type GameLogEntry = z.infer<typeof GameLogEntrySchema>;

export const EngineLogEntrySchema = z.object({
	id: isULID(),
	gameId: isULID(),
	createdAt: z.date(),
	operation: EngineLogOperationSchema,
	phase: GamePhaseSchema.nullable(),
	data: z.record(z.string(), z.unknown()),
	lines: z.array(z.string()),
});
export type EngineLogEntry = z.infer<typeof EngineLogEntrySchema>;

/** Returns one deterministic page of the server-only per-game audit timeline. */
export const listGameLogs = fn(ListGameLogsInputSchema, async ({ gameId, cursor, limit }) => {
	return useTransaction(async (tx) => {
		const [game] = await tx
			.select({ id: gameTable.id })
			.from(gameTable)
			.where(eq(gameTable.id, gameId))
			.limit(1);
		Assert.gameFound(game);
		let cursorSequence: number | undefined;
		if (cursor) {
			const [cursorLog] = await tx
				.select({ sequence: gameLogTable.sequence })
				.from(gameLogTable)
				.where(and(eq(gameLogTable.gameId, gameId), eq(gameLogTable.id, cursor)))
				.limit(1);
			if (!cursorLog) {
				throw new InputError(GameSessionErrors.InvalidLogCursor, 'Invalid game log cursor');
			}
			cursorSequence = cursorLog.sequence;
		}

		const rows = await tx
			.select()
			.from(gameLogTable)
			.where(
				and(
					eq(gameLogTable.gameId, gameId),
					cursorSequence !== undefined
						? gt(gameLogTable.sequence, cursorSequence)
						: undefined,
				),
			)
			.orderBy(asc(gameLogTable.sequence))
			.limit(limit + 1);
		const hasMore = rows.length > limit;
		const items = (hasMore ? rows.slice(0, limit) : rows).map((row) =>
			GameLogEntrySchema.parse(row),
		);

		return {
			items,
			meta: {
				limit,
				hasMore,
				nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
			},
		} satisfies Page<GameLogEntry>;
	});
});

/** Returns one deterministic page of raw engine diagnostics for one game. */
export const listEngineLogs = fn(ListEngineLogsInputSchema, async ({ gameId, cursor, limit }) => {
	return useTransaction(async (tx) => {
		const [game] = await tx
			.select({ id: gameTable.id })
			.from(gameTable)
			.where(eq(gameTable.id, gameId))
			.limit(1);
		Assert.gameFound(game);

		const rows = await tx
			.select()
			.from(engineLogTable)
			.where(
				and(
					eq(engineLogTable.gameId, gameId),
					cursor ? gt(engineLogTable.id, cursor) : undefined,
				),
			)
			.orderBy(asc(engineLogTable.id))
			.limit(limit + 1);
		const hasMore = rows.length > limit;
		const items = (hasMore ? rows.slice(0, limit) : rows).map((row) =>
			EngineLogEntrySchema.parse(row),
		);

		return {
			items,
			meta: {
				limit,
				hasMore,
				nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
			},
		} satisfies Page<EngineLogEntry>;
	});
});

export const appendGameLog = async (tx: TxOrDb, input: GameLogInput) => {
	const id = ulid();
	const [game] = await tx
		.update(gameTable)
		.set({ auditLogSequence: sql`${gameTable.auditLogSequence} + 1` })
		.where(eq(gameTable.id, input.gameId))
		.returning({ sequence: gameTable.auditLogSequence });
	if (!game) {
		throw new Error(`Cannot append log for missing game ${input.gameId}`);
	}

	await tx.insert(gameLogTable).values({ id, sequence: game.sequence, ...input });
	return id;
};

export const appendEngineLog = async (tx: TxOrDb, input: EngineLogInput) => {
	const id = ulid();
	await tx.insert(engineLogTable).values({ id, ...input });
	return id;
};
