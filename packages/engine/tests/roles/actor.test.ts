import { describe, expect, it } from 'vitest';
import { Citizen } from '../../src/roles/citizen';
import { Mafioso } from '../../src/roles/mafioso';
import { createContext, makePlayer } from './fixtures';

describe('actor', () => {
	it('respects night immunity', () => {
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

		citizen.nightImmune = true;
		mafioso.setTargets([citizen]);
		mafioso.doAction();

		expect(citizen.alive).toBe(true);
	});

	it('tracks visits', () => {
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

		mafioso.visit(citizen);

		expect(citizen.visitors).toContain(mafioso);
		expect(mafioso.visiting).toBe(citizen);
	});

	it('records death reason', () => {
		const context = createContext();
		const citizen = new Citizen(
			makePlayer({ name: 'A', alias: 'test_citizen_1', number: 1, id: '1' }),
			{},
			context,
		);

		citizen.die('Killed by God');

		expect(citizen.alive).toBe(false);
		expect(citizen.cod).toBe('Killed by God');
	});
});
