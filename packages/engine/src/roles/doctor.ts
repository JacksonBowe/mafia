import { z } from 'zod';
import type { ActorState } from '../types';
import { GameEvent, GameEventGroup } from '../events';
import { Town, type ActorContext, type Actor } from './actor';

export const DoctorSettingsSchema = z.object({}).strict();

export type DoctorSettings = z.infer<typeof DoctorSettingsSchema>;

export class Doctor extends Town {
	static override tags = ['any_random', 'town_random', 'town_protective'];

	constructor(
		input: ActorState,
		_settings: Record<string, unknown> = {},
		context: ActorContext,
	) {
		super(input, context);
		DoctorSettingsSchema.parse(_settings);
	}

	override findPossibleTargets(actors: Actor[] = []) {
		const numTargets = 1;
		this.possibleTargets = [];
		for (let i = 0; i < numTargets; i += 1) {
			this.possibleTargets[i] = actors.filter((actor) => actor.alive && actor !== this);
		}
		return this.possibleTargets;
	}

	override action() {
		const target = this.targets[0];
		if (!target) return;
		this.logger.info(`${this.toString()} will attempt to heal ${target.toString()}`);
		this.visit(target);
		target.doctors.push(this);
	}

	reviveTarget(target: Actor) {
		this.logger.info(`${this.toString()} revives ${target.toString()}`);
		const reviveEventGroup = new GameEventGroup('doctor_revive');
		reviveEventGroup.newEvent(
			new GameEvent(
				'doctor_revive_success',
				[this.input.id],
				'Your target was attacked last night, but you successfully revived them',
			),
		);
		reviveEventGroup.newEvent(
			new GameEvent(
				'revive_by_doctor',
				[target.input.id],
				'You were revived by a doctor. Rock on',
			),
		);
		this.actionEvents.newEventGroup(reviveEventGroup);
	}
}
