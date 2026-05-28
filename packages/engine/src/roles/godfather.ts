import { z } from 'zod';
import { DEFAULT_NIGHT_IMMUNE, EventIds } from '../constants';
import { GameEvent, GameEventGroup } from '../events';
import { Mafia, type ActorContext, type Actor, type ActorState } from './actor';
import { Mafioso } from './mafioso';
import { RoleTags } from './role';

export const GodfatherSettingsSchema = z.object({
	nightImmune: z.number().int().min(0).default(DEFAULT_NIGHT_IMMUNE),
});

export type GodfatherSettings = z.infer<typeof GodfatherSettingsSchema>;
export type GodfatherSettingsInput = z.input<typeof GodfatherSettingsSchema>;

export class Godfather extends Mafia {
	static override tags = [
		...super.tags,
		RoleTags.MafiaKilling,
	];

	static override roleName = 'Godfather' as const;
	static override roleKey = 'godfather' as const;

	static override priority = 3;
	static settingsSchema = GodfatherSettingsSchema;
	static description = 'Mafia leader who can delegate kills and starts night-immune.';

	constructor(
		input: ActorState,
		settings: GodfatherSettingsInput = {},
		context: ActorContext,
	) {
		super(input, context);
		const parsed = GodfatherSettingsSchema.parse(settings);
		this.nightImmune = parsed.nightImmune > 0;
	}

	override findPossibleTargets(actors: Actor[] = []) {
		return this.setSingleTarget(
			actors,
			(actor) => actor.alive && actor.alignment !== this.alignment && actor !== this,
		);
	}

	override action() {
		const target = this.targets[0];
		if (!target) return;

		const proxies = this.allies.filter((ally): ally is Mafioso => ally instanceof Mafioso);
		if (proxies.length === 0) {
			this.mafiaKill(target, 'godfather');
			return;
		}
		const proxy = this.rng.choice(proxies);
		proxy.setTargets(this.targets);

		const proxyEventGroup = new GameEventGroup(EventIds.GODFATHER_PROXY);
		proxyEventGroup.newEvent(
			new GameEvent(
				EventIds.GODFATHER_PROXY_CHOICE,
				this.allies.map((ally) => ally.input.id),
				`The Godfather has chosen ${proxy.alias} to carry out the hit`,
			),
		);
		this.logger.info(`${this.toString()} has chosen ${proxy.toString()} to act as a proxy`);
		this.actionEvents.newEventGroup(proxyEventGroup);
	}
}
