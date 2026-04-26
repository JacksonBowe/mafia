import { z } from 'zod';
import { DEFAULT_NIGHT_IMMUNE, EventIds } from '../constants';
import type { ActorState } from '../types';
import { GameEvent, GameEventGroup } from '../events';
import { Mafia, type ActorContext, type Actor } from './actor';
import { Mafioso } from './mafioso';

export const GodfatherSettingsSchema = z.object({
	nightImmune: z.number().int().min(0).default(DEFAULT_NIGHT_IMMUNE),
});

export type GodfatherSettings = z.infer<typeof GodfatherSettingsSchema>;

export class Godfather extends Mafia {
	static override tags = ['any_random', 'mafia_random', 'mafia_killing'];
	static override roleName = 'Godfather' as const;
	static override priority = 3;

	constructor(
		input: ActorState,
		settings: Record<string, unknown> = {},
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
