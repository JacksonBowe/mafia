import { describe, expect, it } from 'vitest';
import { Citizen } from '../../src/roles/citizen';
import { Mafioso } from '../../src/roles/mafioso';
import { createContext, makePlayer } from './fixtures';

describe('citizen', () => {
	it('finds possible targets', () => {
		const context = createContext();
		const citizen = new Citizen(
			makePlayer({ name: 'A', alias: 'test_citizen_1', number: 1, id: '1' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makePlayer({ name: 'C', alias: 'test_mafioso_1', number: 3, id: '3' }),
			{},
			context,
		);

		citizen.findPossibleTargets([mafioso]);

		expect(citizen.possibleTargets).toHaveLength(1);
		expect(citizen.possibleTargets[0]).toHaveLength(1);
		expect(citizen.possibleTargets[0][0]).toBe(citizen);
	});

	it('does not assign allies', () => {
		const context = createContext();
		const citizen1 = new Citizen(
			makePlayer({ name: 'A', alias: 'test_citizen_1', number: 1, id: '1' }),
			{},
			context,
		);
		const citizen2 = new Citizen(
			makePlayer({ name: 'B', alias: 'test_citizen_2', number: 2, id: '2' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makePlayer({ name: 'C', alias: 'test_mafioso_1', number: 3, id: '3' }),
			{},
			context,
		);

		citizen1.findAllies([citizen1, citizen2, mafioso]);
		expect(citizen1.allies).toHaveLength(0);
	});

	it('uses vest and updates remaining count', () => {
		const context = createContext();
		const citizen = new Citizen(
			makePlayer({ name: 'A', alias: 'test_citizen_1', number: 1, id: '1' }),
			{},
			context,
		);

		const beforeState = citizen.dumpState().roleActions as
			| { remainingVests: number }
			| undefined;
		const before = beforeState?.remainingVests ?? 0;
		citizen.setTargets([citizen]);
		citizen.doAction();
		const afterState = citizen.dumpState().roleActions as
			| { remainingVests: number }
			| undefined;
		const after = afterState?.remainingVests ?? 0;

		expect(citizen.nightImmune).toBe(true);
		expect(after).toBe(before - 1);
	});

	it('handles win conditions', () => {
		const context = createContext();
		const citizen1 = new Citizen(
			makePlayer({ name: 'A', alias: 'test_citizen_1', number: 1, id: '1' }),
			{},
			context,
		);
		const citizen2 = new Citizen(
			makePlayer({ name: 'B', alias: 'test_citizen_2', number: 2, id: '2' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makePlayer({ name: 'C', alias: 'test_mafioso_1', number: 3, id: '3' }),
			{},
			context,
		);

		expect(citizen1.checkForWin([citizen1, citizen2, mafioso])).toBe(false);
		expect(citizen1.checkForWin([citizen1, citizen2])).toBe(true);
		expect(citizen1.checkForWin([citizen1, mafioso])).toBe(true);
	});
});
