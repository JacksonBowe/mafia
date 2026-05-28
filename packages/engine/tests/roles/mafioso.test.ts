import { describe, expect, it } from 'vitest';
import { Citizen } from '../../src/roles/citizen';
import { Doctor } from '../../src/roles/doctor';
import { Mafioso } from '../../src/roles/mafioso';
import { createContext, makeActor } from './fixtures';

describe('mafioso', () => {
	it('finds non-mafia, alive, non-self targets', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makeActor({ name: 'B', alias: 'test_mafioso', number: 2, id: '2' }),
			{},
			context,
		);
		const doctor = new Doctor(
			makeActor({ name: 'C', alias: 'test_doctor', number: 3, id: '3' }),
			{},
			context,
		);

		mafioso.findPossibleTargets([citizen, mafioso, doctor]);

		expect(mafioso.possibleTargets).toHaveLength(1);
		expect(mafioso.possibleTargets[0]).toHaveLength(2);
		expect(mafioso.possibleTargets[0]).toContain(citizen);
		expect(mafioso.possibleTargets[0]).toContain(doctor);
	});

	it('excludes dead actors from targets', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1', alive: false }),
			{},
			context,
		);
		const doctor = new Doctor(
			makeActor({ name: 'C', alias: 'test_doctor', number: 3, id: '3' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makeActor({ name: 'B', alias: 'test_mafioso', number: 2, id: '2' }),
			{},
			context,
		);

		mafioso.findPossibleTargets([citizen, mafioso, doctor]);

		expect(mafioso.possibleTargets[0]).not.toContain(citizen);
		expect(mafioso.possibleTargets[0]).toContain(doctor);
	});

	it('kills a non-immune target', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makeActor({ name: 'B', alias: 'test_mafioso', number: 2, id: '2' }),
			{},
			context,
		);

		mafioso.setTargets([citizen]);
		mafioso.doAction();

		expect(mafioso.visiting).toBe(citizen);
		expect(citizen.visitors).toContain(mafioso);
		expect(citizen.alive).toBe(false);
	});

	it('fails to kill a night-immune target', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makeActor({ name: 'B', alias: 'test_mafioso', number: 2, id: '2' }),
			{},
			context,
		);

		citizen.nightImmune = true;
		mafioso.setTargets([citizen]);
		mafioso.doAction();

		expect(citizen.alive).toBe(true);
	});

	it('clears brother mafioso targets when acting', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const doctor = new Doctor(
			makeActor({ name: 'D', alias: 'test_doctor', number: 4, id: '4' }),
			{},
			context,
		);
		const mafioso1 = new Mafioso(
			makeActor({ name: 'B', alias: 'test_mafioso_1', number: 2, id: '2' }),
			{},
			context,
		);
		const mafioso2 = new Mafioso(
			makeActor({ name: 'C', alias: 'test_mafioso_2', number: 3, id: '3' }),
			{},
			context,
		);

		mafioso1.findAllies([citizen, mafioso1, mafioso2, doctor]);
		mafioso2.findAllies([citizen, mafioso1, mafioso2, doctor]);

		mafioso1.setTargets([citizen]);
		mafioso2.setTargets([doctor]);
		mafioso1.doAction();

		expect(mafioso2.targets).toEqual([]);
	});

	it('all mafia (alive and dead) win when no town remain', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({
				name: 'A',
				alias: 'test_citizen',
				number: 1,
				id: '1',
				alive: false,
			}),
			{},
			context,
		);
		const mafioso1 = new Mafioso(
			makeActor({
				name: 'B',
				alias: 'test_mafioso_1',
				number: 2,
				id: '2',
				alive: false,
			}),
			{},
			context,
		);
		const mafioso2 = new Mafioso(
			makeActor({
				name: 'C',
				alias: 'test_mafioso_2',
				number: 3,
				id: '3',
				alive: false,
			}),
			{},
			context,
		);
		const mafioso3 = new Mafioso(
			makeActor({ name: 'D', alias: 'test_mafioso_3', number: 4, id: '4' }),
			{},
			context,
		);

		const actors = [citizen, mafioso1, mafioso2, mafioso3];

		expect(mafioso1.checkForWin(actors)).toBe(true);
		expect(mafioso2.checkForWin(actors)).toBe(true);
		expect(mafioso3.checkForWin(actors)).toBe(true);
	});

	it('does nothing when no target is set', () => {
		const context = createContext();
		const mafioso = new Mafioso(
			makeActor({ name: 'B', alias: 'test_mafioso', number: 2, id: '2' }),
			{},
			context,
		);

		mafioso.doAction();

		expect(mafioso.visiting).toBeNull();
	});
});
