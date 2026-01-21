import type { PlayerInput } from '../types';
import { Duration, GameEvent, GameEventGroup } from '../events';
import { Town, type ActorContext, type Actor } from './actor';

export class Bodyguard extends Town {
	static override tags = ['any_random', 'town_random', 'town_protective', 'town_killing'];
	private guarding?: Actor;

	constructor(
		player: PlayerInput,
		_settings: Record<string, unknown> = {},
		context: ActorContext,
	) {
		super(player, context);
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
		this.logger.info(`${this} will protect ${target}`);
		this.visit(target);
		target.bodyguards.push(this);
		this.guarding = target;
	}

	shootout(attacker: Actor) {
		this.logger.info(`${this} defends their target from ${attacker}`);
		const shootoutEventGroup = new GameEventGroup('shootout');
		shootoutEventGroup.duration = Duration.SHOOTOUT;
		shootoutEventGroup.newEvent(
			new GameEvent(
				'bodyguard_shootout',
				['*'],
				'You hear sounds of a shootout',
			),
		);
		if (this.guarding) {
			shootoutEventGroup.newEvent(
				new GameEvent(
					'bodyguard_protected',
					[this.guarding.player.id],
					'You were protected by a bodyguard',
				),
			);
		}
		shootoutEventGroup.newEvent(
			new GameEvent(
				'bodyguard_protected',
				[attacker.player.id],
				'You were killed by the Bodyguard defending your target',
			),
		);
		shootoutEventGroup.newEvent(
			new GameEvent(
				'bodyguard_protected',
				[this.player.id],
				'You died defending your target',
			),
		);
		this.actionEvents.newEventGroup(shootoutEventGroup);
		this.die('Died in a shootout');
		attacker.die('Died in a shootout');
	}
}
