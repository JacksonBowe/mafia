import { ulid } from 'ulid';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { TxOrDb } from '../db/transaction';
import { engineLogTable, gameLogTable, gameTable } from './game.sql';
import type { GamePhaseSchema } from './schema';

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
