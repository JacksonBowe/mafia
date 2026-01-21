import { describe, expect, it } from 'vitest';
import { Bodyguard } from '../../src/roles/bodyguard';
import { Citizen } from '../../src/roles/citizen';
import { Doctor } from '../../src/roles/doctor';
import { Mafioso } from '../../src/roles/mafioso';
import { createContext, makePlayer } from './fixtures';

describe('doctor', () => {
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
		const doctor = new Doctor(
			makePlayer({ name: 'C', alias: 'test_doctor', number: 3, id: '3' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makePlayer({ name: 'D', alias: 'test_mafioso', number: 4, id: '4' }),
			{},
			context,
		);

		doctor.findPossibleTargets([citizen, bodyguard, doctor, mafioso]);

		expect(doctor.possibleTargets).toHaveLength(1);
		expect(doctor.possibleTargets[0]).toHaveLength(3);
		expect(doctor.possibleTargets[0]).not.toContain(doctor);
	});

	it('heals a citizen from a mafia attack', () => {
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
		const doctor = new Doctor(
			makePlayer({ name: 'C', alias: 'test_doctor', number: 3, id: '3' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makePlayer({ name: 'D', alias: 'test_mafioso', number: 4, id: '4' }),
			{},
			context,
		);

		doctor.setTargets([citizen]);
		doctor.doAction();

		expect(citizen.alive).toBe(true);
		expect(doctor.visiting).toBe(citizen);
		expect(citizen.doctors).toContain(doctor);

		mafioso.setTargets([citizen]);
		mafioso.doAction();

		expect(citizen.alive).toBe(true);
		expect(mafioso.alive).toBe(true);
		expect(bodyguard.alive).toBe(true);
		expect(doctor.alive).toBe(true);
	});

	it('revives a bodyguard after a shootout', () => {
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
		const doctor = new Doctor(
			makePlayer({ name: 'C', alias: 'test_doctor', number: 3, id: '3' }),
			{},
			context,
		);
		const mafioso = new Mafioso(
			makePlayer({ name: 'D', alias: 'test_mafioso', number: 4, id: '4' }),
			{},
			context,
		);

		doctor.setTargets([bodyguard]);
		doctor.doAction();
		bodyguard.setTargets([citizen]);
		bodyguard.doAction();
		mafioso.setTargets([citizen]);
		mafioso.doAction();

		expect(citizen.alive).toBe(true);
		expect(mafioso.alive).toBe(false);
		expect(bodyguard.alive).toBe(true);
	});
});
