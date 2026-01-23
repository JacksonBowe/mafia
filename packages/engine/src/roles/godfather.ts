import { z } from 'zod';
import type { PlayerInput } from '../types';
import { Duration, GameEvent, GameEventGroup, CommonEvents } from '../events';
import { Mafia, type ActorContext, type Actor } from './actor';
import { Mafioso } from './mafioso';

const GodfatherSettingsSchema = z.object({
	nightImmune: z.number().int().min(0).default(2),
});

export class Godfather extends Mafia {
	constructor(
		player: PlayerInput,
		settings: Record<string, unknown> = {},
		context: ActorContext,
	) {
		super(player, context);
		const parsed = GodfatherSettingsSchema.parse(settings);
		this.nightImmune = parsed.nightImmune > 0;
	}

	override findPossibleTargets(actors: Actor[] = []) {
		const numTargets = 1;
		this.possibleTargets = [];
		for (let i = 0; i < numTargets; i += 1) {
			this.possibleTargets[i] = actors.filter(
				(actor) => actor.alive && actor.alignment !== this.alignment && actor !== this,
			);
		}
		return this.possibleTargets;
	}

	override action() {
		const target = this.targets[0];
		if (!target) return;

		const success = () => {
			const successEventGroup = new GameEventGroup('godfather_action_success');
			successEventGroup.duration = Duration.MAFIA_KILL;
			successEventGroup.newEvent(
				new GameEvent(
					'godfather_kill_success',
					['*'],
					'There are sounds of shots in the streets',
				),
			);
			successEventGroup.newEvent(
				new GameEvent(
					CommonEvents.KILLED_BY_MAFIA,
					[target.player.id],
					'You were killed by a member of the Mafia',
				),
			);
			this.actionEvents.newEventGroup(successEventGroup);
		};

		const fail = () => {
			const failEventGroup = new GameEventGroup('godfather_action_fail');
			failEventGroup.duration = Duration.MAFIA_KILL;
			failEventGroup.newEvent(new GameEvent('godfather_kill_fail', ['*'], ''));
			this.actionEvents.newEventGroup(failEventGroup);
		};

		const proxies = this.allies.filter((ally) => ally instanceof Mafioso);
		if (proxies.length === 0) {
			this.kill(target, success, fail);
			return;
		}
		const proxy = this.rng.choice(proxies);
		proxy.targets = this.targets;

		const proxyEventGroup = new GameEventGroup('godfather_proxy');
		proxyEventGroup.newEvent(
			new GameEvent(
				'godfather_proxy_choice',
				this.allies.map((ally) => ally.player.id),
				`The Godfather has chosen ${proxy.alias} to carry out the hit`,
			),
		);
		this.logger.info(`${this} has chosen ${proxy} to act as a proxy`);
		this.actionEvents.newEventGroup(proxyEventGroup);
	}
}
