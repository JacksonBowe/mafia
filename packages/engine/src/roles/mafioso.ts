import type { PlayerInput } from '../types';
import { Duration, GameEvent, GameEventGroup, CommonEvents } from '../events';
import { Mafia, type ActorContext, type Actor } from './actor';

export class Mafioso extends Mafia {
	static override tags = ['any_random', 'mafia_random', 'mafia_killing'];

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
			this.possibleTargets[i] = actors.filter(
				(actor) => actor.alive && actor.alignment !== this.alignment && actor.number !== this.number,
			);
		}
		return this.possibleTargets;
	}

	override action() {
		const target = this.targets[0];
		if (!target) return;
		const brothers = this.allies.filter((ally) => ally instanceof Mafioso);
		for (const brother of brothers) {
			brother.clearTargets();
		}

		const success = () => {
			const successEventGroup = new GameEventGroup('mafioso_action_success');
			successEventGroup.duration = Duration.MAFIA_KILL;
			successEventGroup.newEvent(
				new GameEvent('mafia_kill_success', ['*'], 'There are sounds of shots in the streets'),
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
			const failEventGroup = new GameEventGroup('mafioso_action_fail');
			failEventGroup.duration = Duration.MAFIA_KILL;
			failEventGroup.newEvent(new GameEvent('mafia_kill_fail', ['*'], ''));
			this.actionEvents.newEventGroup(failEventGroup);
		};

		this.kill(target, success, fail);
	}
}
