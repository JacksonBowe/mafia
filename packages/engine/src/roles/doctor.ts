import { z } from 'zod';
import { EventIds } from '../constants';
import type { ActorState } from '../types';
import { GameEvent, GameEventGroup } from '../events';
import { Town, type ActorContext, type Actor } from './actor';

export const DoctorSettingsSchema = z.object({}).strict();

export type DoctorSettings = z.infer<typeof DoctorSettingsSchema>;

export class Doctor extends Town {
	static override tags = ['any_random', 'town_random', 'town_protective'];
	static override roleName = 'Doctor' as const;
	static override priority = 1;

	constructor(
		input: ActorState,
		settings: Record<string, unknown> = {},
		context: ActorContext,
	) {
		super(input, context);
		DoctorSettingsSchema.parse(settings);
	}

	override findPossibleTargets(actors: Actor[] = []) {
		return this.setSingleTarget(actors, (actor) => actor.alive && actor !== this);
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
		const reviveEventGroup = new GameEventGroup(EventIds.DOCTOR_REVIVE);
		reviveEventGroup.newEvent(
			new GameEvent(
				EventIds.DOCTOR_REVIVE_SUCCESS,
				[this.input.id],
				'Your target was attacked last night, but you successfully revived them',
			),
		);
		reviveEventGroup.newEvent(
			new GameEvent(
				EventIds.REVIVE_BY_DOCTOR,
				[target.input.id],
				'You were revived by a doctor. Rock on',
			),
		);
		this.actionEvents.newEventGroup(reviveEventGroup);
	}
}
