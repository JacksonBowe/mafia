import { z } from 'zod';
import type { ActorState } from '../types';
import { Mafia, type ActorContext, type Actor } from './actor';

export const MafiosoSettingsSchema = z.object({}).strict();

export type MafiosoSettings = z.infer<typeof MafiosoSettingsSchema>;

export class Mafioso extends Mafia {
	static override tags = ['any_random', 'mafia_random', 'mafia_killing'];
	static override roleName = 'Mafioso' as const;
	static override priority = 4;

	constructor(
		input: ActorState,
		settings: Record<string, unknown> = {},
		context: ActorContext,
	) {
		super(input, context);
		MafiosoSettingsSchema.parse(settings);
	}

	override findPossibleTargets(actors: Actor[] = []) {
		return this.setSingleTarget(
			actors,
			(actor) =>
				actor.alive &&
				actor.alignment !== this.alignment &&
				actor.number !== this.number,
		);
	}

	override action() {
		const target = this.targets[0];
		if (!target) return;
		const brothers = this.allies.filter((ally): ally is Mafioso => ally instanceof Mafioso);
		for (const brother of brothers) {
			brother.clearTargets();
		}
		this.mafiaKill(target, 'mafioso');
	}
}
