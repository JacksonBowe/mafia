import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db/transaction', () => ({
	useTransaction: vi.fn(),
}));

import { useTransaction } from '../../src/db/transaction';
import {
	appendEngineLog,
	appendGameLog,
	EngineLogOperationSchema,
	GameLogTypeSchema,
	listEngineLogs,
	listGameLogs,
} from '../../src/game/session/log';

const GAME_ID = '01J00000000000000000000000';

const gameLogInput = {
	gameId: GAME_ID,
	type: 'game.vote.cast' as const,
	phase: 'poll' as const,
	actorId: 'actor-1',
	data: { targetActorId: 'actor-2' },
};

const logRow = {
	id: '01J00000000000000000000001',
	gameId: GAME_ID,
	createdAt: new Date('2026-01-01T00:00:00.000Z'),
	type: 'game.vote.cast' as const,
	phase: 'poll' as const,
	actorId: 'actor-1',
	sequence: 1,
	data: { targetActorId: 'actor-2' },
};

function selectQuery(rows: unknown[]) {
	const limit = vi.fn().mockResolvedValue(rows);
	const orderBy = vi.fn().mockReturnValue({ limit });
	const where = vi.fn().mockReturnValue({ limit, orderBy });
	return { from: vi.fn().mockReturnValue({ where }) };
}

function mockLogRead(...rows: unknown[][]) {
	const tx = {
		select: vi.fn().mockImplementation(() => selectQuery(rows.shift() ?? [])),
	};
	vi.mocked(useTransaction).mockImplementation((callback) => callback(tx as never));
}

describe('game log contracts', () => {
	// TODO: Add Neon-backed tests for action/phase/completion log commits and transaction rollback.
	it('allows audit event types only', () => {
		expect(GameLogTypeSchema.parse('game.chat.sent')).toBe('game.chat.sent');
		expect(GameLogTypeSchema.parse('game.over')).toBe('game.over');
		expect(() => GameLogTypeSchema.parse('game.websocket.received')).toThrow();
	});

	it('keeps engine diagnostics scoped to known engine operations', () => {
		expect(EngineLogOperationSchema.parse('resolve')).toBe('resolve');
		expect(EngineLogOperationSchema.parse('load-win-check')).toBe('load-win-check');
		expect(() => EngineLogOperationSchema.parse('unknown')).toThrow();
	});

	it('allocates a game sequence before inserting an audit entry', async () => {
		const values = vi.fn().mockResolvedValue(undefined);
		const returning = vi.fn().mockResolvedValue([{ sequence: 7 }]);
		const where = vi.fn().mockReturnValue({ returning });
		const set = vi.fn().mockReturnValue({ where });
		const update = vi.fn().mockReturnValue({ set });
		const insert = vi.fn().mockReturnValue({ values });
		const tx = { update, insert };

		await appendGameLog(tx as never, gameLogInput);

		expect(update).toHaveBeenCalledOnce();
		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({ ...gameLogInput, sequence: 7 }),
		);
	});

	it('does not insert an audit entry when sequence allocation fails', async () => {
		const values = vi.fn();
		const returning = vi.fn().mockRejectedValue(new Error('transaction failed'));
		const where = vi.fn().mockReturnValue({ returning });
		const set = vi.fn().mockReturnValue({ where });
		const update = vi.fn().mockReturnValue({ set });
		const insert = vi.fn().mockReturnValue({ values });
		const tx = { update, insert };

		await expect(appendGameLog(tx as never, gameLogInput)).rejects.toThrow(
			'transaction failed',
		);
		expect(values).not.toHaveBeenCalled();
	});

	it('propagates an audit insert failure to its enclosing transaction', async () => {
		const values = vi.fn().mockRejectedValue(new Error('insert failed'));
		const returning = vi.fn().mockResolvedValue([{ sequence: 7 }]);
		const where = vi.fn().mockReturnValue({ returning });
		const set = vi.fn().mockReturnValue({ where });
		const update = vi.fn().mockReturnValue({ set });
		const insert = vi.fn().mockReturnValue({ values });

		await expect(appendGameLog({ update, insert } as never, gameLogInput)).rejects.toThrow(
			'insert failed',
		);
	});

	it('stores raw engine lines in the engine log', async () => {
		const values = vi.fn().mockResolvedValue(undefined);
		const insert = vi.fn().mockReturnValue({ values });

		await appendEngineLog({ insert } as never, {
			gameId: GAME_ID,
			operation: 'resolve',
			phase: 'evening',
			data: { day: 1 },
			lines: ['Resolving targets'],
		});

		expect(insert).toHaveBeenCalledOnce();
		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({ lines: ['Resolving targets'] }),
		);
	});

	it('reads audit logs in immutable sequence order', async () => {
		mockLogRead(
			[{ id: GAME_ID }],
			[logRow, { ...logRow, id: '01J00000000000000000000002', sequence: 2 }],
		);

		const page = await listGameLogs({ gameId: GAME_ID, limit: 2 });

		expect(page).toEqual({
			items: [logRow, { ...logRow, id: '01J00000000000000000000002', sequence: 2 }],
			meta: { limit: 2, hasMore: false, nextCursor: null },
		});
	});

	it('uses the last engine-log ULID as the page cursor', async () => {
		const engineRows = [
			{
				id: '01J00000000000000000000003',
				gameId: GAME_ID,
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
				operation: 'resolve' as const,
				phase: 'evening' as const,
				data: { day: 1 },
				lines: ['first'],
			},
			{
				id: '01J00000000000000000000004',
				gameId: GAME_ID,
				createdAt: new Date('2026-01-01T00:00:00.000Z'),
				operation: 'resolve' as const,
				phase: 'evening' as const,
				data: { day: 1 },
				lines: ['second'],
			},
		];
		mockLogRead([{ id: GAME_ID }], engineRows);

		const page = await listEngineLogs({ gameId: GAME_ID, limit: 1 });

		expect(page.items).toEqual([engineRows[0]]);
		expect(page.meta.nextCursor).toBe(engineRows[0].id);
	});
});
