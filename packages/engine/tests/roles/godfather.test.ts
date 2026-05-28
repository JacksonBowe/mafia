import { describe, expect, it } from 'vitest';
import { Citizen } from '../../src/roles/citizen';
import { Doctor } from '../../src/roles/doctor';
import { Godfather } from '../../src/roles/godfather';
import { Mafioso } from '../../src/roles/mafioso';
import { createContext, makeActor } from './fixtures';

describe('godfather', () => {
	it('finds possible targets', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const godfather = new Godfather(
			makeActor({ name: 'B', alias: 'test_godfather', number: 2, id: '2' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makeActor({ name: 'C', alias: 'test_mafioso', number: 3, id: '3' }),
			{},
			context,
		);
		const doctor = new Doctor(
			makeActor({ name: 'D', alias: 'test_doctor', number: 4, id: '4' }),
			{},
			context,
		);

		godfather.findPossibleTargets([citizen, godfather, mafioso, doctor]);

		expect(godfather.possibleTargets).toHaveLength(1);
		expect(godfather.possibleTargets[0]).toHaveLength(2);
		expect(godfather.possibleTargets[0]).toContain(citizen);
		expect(godfather.possibleTargets[0]).toContain(doctor);
	});

	it('uses a mafioso proxy when available', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const godfather = new Godfather(
			makeActor({ name: 'B', alias: 'test_godfather', number: 2, id: '2' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makeActor({ name: 'C', alias: 'test_mafioso', number: 3, id: '3' }),
			{},
			context,
		);
		const doctor = new Doctor(
			makeActor({ name: 'D', alias: 'test_doctor', number: 4, id: '4' }),
			{},
			context,
		);

		godfather.findAllies([citizen, godfather, mafioso, doctor]);
		godfather.setTargets([citizen]);
		godfather.doAction();

		expect(godfather.visiting).toBeNull();
		expect(mafioso.visitors).not.toContain(godfather);
		expect(citizen.visitors).not.toContain(godfather);

		mafioso.doAction();

		expect(mafioso.visiting).toBe(citizen);
		expect(citizen.alive).toBe(false);
	});

	it('kills directly when no proxy exists', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const godfather = new Godfather(
			makeActor({ name: 'B', alias: 'test_godfather', number: 2, id: '2' }),
			{},
			context,
		);
		const doctor = new Doctor(
			makeActor({ name: 'D', alias: 'test_doctor', number: 4, id: '4' }),
			{},
			context,
		);

		godfather.setTargets([citizen]);
		godfather.doAction();

		expect(godfather.visiting).toBe(citizen);
		expect(citizen.visitors).toContain(godfather);
		expect(citizen.alive).toBe(false);
		expect(doctor.alive).toBe(true);
	});

	it('fails to kill a night-immune target', () => {
		const context = createContext();
		const citizen = new Citizen(
			makeActor({ name: 'A', alias: 'test_citizen', number: 1, id: '1' }),
			{},
			context,
		);
		const godfather = new Godfather(
			makeActor({ name: 'B', alias: 'test_godfather', number: 2, id: '2' }),
			{},
			context,
		);

		citizen.nightImmune = true;
		godfather.setTargets([citizen]);
		godfather.doAction();

		expect(godfather.visiting).toBe(citizen);
		expect(citizen.visitors).toContain(godfather);
		expect(citizen.alive).toBe(true);
	});
});
