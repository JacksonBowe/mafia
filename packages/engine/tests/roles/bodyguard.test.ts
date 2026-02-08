import { describe, expect, it } from 'vitest';
import { Bodyguard } from '../../src/roles/bodyguard';
import { Citizen } from '../../src/roles/citizen';
import { Mafioso } from '../../src/roles/mafioso';
import { createContext, makePlayer } from './fixtures';

describe('bodyguard', () => {
	it('finds possible targets', () => {
		const context = createContext();
		const citizen = new Citizen(
			makePlayer({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const bodyguard = new Bodyguard(
			makePlayer({ name: 'B', alias: 'test_bodyguard', number: 2, id: '2' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makePlayer({ name: 'C', alias: 'test_mafioso', number: 3, id: '3' }),
			{},
			context,
		);

		bodyguard.findPossibleTargets([citizen, bodyguard, mafioso]);

		expect(bodyguard.possibleTargets).toHaveLength(1);
		expect(bodyguard.possibleTargets[0]).toHaveLength(2);
		expect(bodyguard.possibleTargets[0]).not.toContain(bodyguard);
	});

	it('guards and survives shootout with mafioso', () => {
		const context = createContext();
		const citizen = new Citizen(
			makePlayer({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const bodyguard = new Bodyguard(
			makePlayer({ name: 'B', alias: 'test_bodyguard', number: 2, id: '2' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makePlayer({ name: 'C', alias: 'test_mafioso', number: 3, id: '3' }),
			{},
			context,
		);

		bodyguard.setTargets([citizen]);
		bodyguard.doAction();

		expect(citizen.alive).toBe(true);
		expect(bodyguard.visiting).toBe(citizen);
		expect(citizen.bodyguards).toContain(bodyguard);

		mafioso.setTargets([citizen]);
		mafioso.doAction();

		expect(citizen.alive).toBe(true);
		expect(mafioso.alive).toBe(false);
		expect(bodyguard.alive).toBe(false);
	});
});
