import { describe, expect, it, vi } from 'vitest';
import {
	appendEngineLog,
	appendGameLog,
	EngineLogOperationSchema,
	GameLogTypeSchema,
} from '../../src/game/log';

const GAME_ID = '01J00000000000000000000000';

const gameLogInput = {
	gameId: GAME_ID,
	type: 'game.vote.cast' as const,
	phase: 'poll' as const,
	actorId: 'actor-1',
	data: { targetActorId: 'actor-2' },
};

describe('game log contracts', () => {
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
});
