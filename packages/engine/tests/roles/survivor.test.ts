import { describe, expect, it } from 'vitest';
import { Mafioso } from '../../src/roles/mafioso';
import { Survivor } from '../../src/roles/survivor';
import { createContext, makeActor } from './fixtures';

describe('survivor', () => {
	it('only targets self when vests remain', () => {
		const context = createContext();
		const survivor = new Survivor(
			makeActor({ name: 'A', alias: 'test_survivor', number: 1, id: '1' }),
			{ maxVests: 1 },
			context,
		);
		const mafioso = new Mafioso(
			makeActor({ name: 'B', alias: 'test_mafioso', number: 2, id: '2' }),
			{},
			context,
		);

		survivor.findPossibleTargets([survivor, mafioso]);

		expect(survivor.possibleTargets).toHaveLength(1);
		expect(survivor.possibleTargets[0]).toEqual([survivor]);
	});

	it('exposes no targets when out of vests', () => {
		const context = createContext();
		const survivor = new Survivor(
			makeActor({ name: 'A', alias: 'test_survivor', number: 1, id: '1' }),
			{ maxVests: 0 },
			context,
		);

		survivor.findPossibleTargets([survivor]);

		expect(survivor.possibleTargets).toEqual([]);
	});

	it('uses vest, decrements count, grants night immunity', () => {
		const context = createContext();
		const survivor = new Survivor(
			makeActor({ name: 'A', alias: 'test_survivor', number: 1, id: '1' }),
			{ maxVests: 2 },
			context,
		);

		survivor.setTargets([survivor]);
		survivor.doAction();

		expect(survivor.nightImmune).toBe(true);
		const dumped = survivor.dumpState().roleActions as { remainingVests: number };
		expect(dumped.remainingVests).toBe(1);
	});

	it('survives mafia attack while vested', () => {
		const context = createContext();
		const survivor = new Survivor(
			makeActor({ name: 'A', alias: 'test_survivor', number: 1, id: '1' }),
			{ maxVests: 1 },
			context,
		);
		const mafioso = new Mafioso(
			makeActor({ name: 'B', alias: 'test_mafioso', number: 2, id: '2' }),
			{},
			context,
		);

		survivor.setTargets([survivor]);
		survivor.doAction();
		mafioso.setTargets([survivor]);
		mafioso.doAction();

		expect(survivor.alive).toBe(true);
	});

	it('persists remaining vests across re-construction', () => {
		const context = createContext();
		const survivor = new Survivor(
			makeActor({
				name: 'A',
				alias: 'test_survivor',
				number: 1,
				id: '1',
				roleActions: { remainingVests: 0 },
			}),
			{ maxVests: 4 },
			context,
		);

		expect(survivor.possibleTargets).toEqual([]);
		survivor.findPossibleTargets([survivor]);
		expect(survivor.possibleTargets).toEqual([]);
	});
});
