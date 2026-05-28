import { z } from 'zod';
import { Mafia, type Actor, type ActorContext, type ActorState } from './actor';
import { RoleTags } from './role';

export const MafiosoSettingsSchema = z.object({}).strict();

export type MafiosoSettings = z.infer<typeof MafiosoSettingsSchema>;
export type MafiosoSettingsInput = z.input<typeof MafiosoSettingsSchema>;

export class Mafioso extends Mafia {
	static override tags = [
		...super.tags,
		RoleTags.MafiaKilling,
	]
	static override roleName = 'Mafioso' as const;
	static override roleKey = 'mafioso' as const;

	static override priority = 4;
	static settingsSchema = MafiosoSettingsSchema;
	static description = 'Mafia attacker that carries out faction kills.';

	constructor(
		input: ActorState,
		settings: MafiosoSettingsInput = {},
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
