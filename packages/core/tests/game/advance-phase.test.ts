import { newGame } from '@mafia/engine';
import { dummyActors, dummyConfig } from '@mafia/engine/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gamePlayerTable, gameTable } from '../../src/game/game.sql';

const { afterTx, appendEngineLog, appendGameLog, createTransaction } = vi.hoisted(() => ({
	afterTx: vi.fn(),
	appendEngineLog: vi.fn().mockResolvedValue('engine-log-id'),
	appendGameLog: vi.fn().mockResolvedValue('game-log-id'),
	createTransaction: vi.fn(),
}));

vi.mock('../../src/db/transaction', () => ({
	afterTx,
	createTransaction,
	useTransaction: createTransaction,
}));

vi.mock('../../src/game/log', () => ({ appendEngineLog, appendGameLog }));

import { advancePhase } from '../../src/game';

const GAME_ID = '01J00000000000000000000000';
const PLAYER_ID = '01J00000000000000000000001';

const hasPhase = (value: unknown): value is { phase: string } =>
	typeof value === 'object' && value !== null && 'phase' in value;

describe('advancePhase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		afterTx.mockResolvedValue(undefined);
	});

	it('clears persisted targets after night resolution', async () => {
		const created = newGame({ actors: dummyActors(3), config: dummyConfig() });
		const game = {
			id: GAME_ID,
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
			status: 'active' as const,
			phase: 'night' as const,
			pollCount: 0,
			engineState: created.state,
			engineConfig: dummyConfig(),
			actors: created.actors,
			events: null,
		};
		const players = created.actors.map((actor, index) => ({
			id: index === 0 ? PLAYER_ID : `01J0000000000000000000000${index + 2}`,
			gameId: GAME_ID,
			userId: `user-${index + 1}`,
			actorId: actor.id,
			number: index + 1,
			voteTargetActorId: null,
			verdict: null,
			onTrial: false,
			targetActorIds: index === 0 ? [created.actors[1].id] : [],
		}));
		const rows = [[game], players];
		const updates: Array<{ table: unknown; values: unknown }> = [];
		const tx = {
			select: vi.fn(() => ({
				from: vi.fn(() => ({ where: vi.fn(() => Promise.resolve(rows.shift())) })),
			})),
			update: vi.fn((table) => ({
				set: vi.fn((values) => {
					updates.push({ table, values });
					return {
						where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: GAME_ID }]) })),
					};
				}),
			})),
		};
		createTransaction.mockImplementation(
			(callback: (transaction: typeof tx) => Promise<unknown>): Promise<unknown> => callback(tx),
		);

		await advancePhase({ gameId: GAME_ID });

		expect(updates).toContainEqual({
			table: gamePlayerTable,
			values: { targetActorIds: [] },
		});
		const gameUpdate = updates.find(({ table }) => table === gameTable);
		expect(hasPhase(gameUpdate?.values) && gameUpdate.values.phase).toBe('morning');
	});
});
