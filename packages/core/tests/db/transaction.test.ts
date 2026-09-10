import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
	db: {
		transaction: vi.fn(),
	},
}));

vi.mock('../../src/db/index.ts', () => ({ db }));

import { afterTx, createTransaction } from '../../src/db/transaction';

type TransactionCallback = (tx: object) => Promise<unknown>;

describe('createTransaction', () => {
	beforeEach(() => {
		db.transaction.mockImplementation(async (callback: TransactionCallback) => callback({}));
	});

	it('waits for registered post-commit effects', async () => {
		let startEffect: () => void = () => {
			throw new Error('Effect start handler was not initialized');
		};
		const effectStarted = new Promise<void>((resolve) => {
			startEffect = resolve;
		});

		let finishEffect: () => void = () => {
			throw new Error('Effect finish handler was not initialized');
		};
		const effect = new Promise<void>((resolve) => {
			finishEffect = resolve;
		});

		const result = createTransaction(async () => {
			await afterTx(() => {
				startEffect();
				return effect;
			});
			return 'committed';
		});

		await effectStarted;
		let resolved = false;
		void result.then(() => {
			resolved = true;
		});
		await Promise.resolve();
		expect(resolved).toBe(false);

		finishEffect();
		await expect(result).resolves.toBe('committed');
	});
});
