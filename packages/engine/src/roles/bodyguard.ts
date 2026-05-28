import { z } from 'zod';
import { BROADCAST_TARGET, DeathReasons, EventIds } from '../constants';
import { Duration, GameEvent, GameEventGroup } from '../events';
import { Town, type Actor, type ActorContext, type ActorState } from './actor';
import { RoleTags } from './role';

export const BodyguardSettingsSchema = z.object({}).strict();

export type BodyguardSettings = z.infer<typeof BodyguardSettingsSchema>;
export type BodyguardSettingsInput = z.input<typeof BodyguardSettingsSchema>;

export class Bodyguard extends Town {
	static override tags = [
		...super.tags,
		RoleTags.TownProtective,
		RoleTags.TownKilling,
	] as const;

	static override roleName = 'Bodyguard' as const;
	static override roleKey = 'bodyguard' as const;

	static override priority = 2;
	static settingsSchema = BodyguardSettingsSchema;
	static description = 'Town protector that intercepts attacks at target home.';

	private guarding?: Actor;

	constructor(
		input: ActorState,
		settings: BodyguardSettingsInput = {},
		context: ActorContext,
	) {
		super(input, context);
		BodyguardSettingsSchema.parse(settings);
	}

	override findPossibleTargets(actors: Actor[] = []) {
		return this.setSingleTarget(actors, (actor) => actor.alive && actor !== this);
	}

	override action() {
		const target = this.targets[0];
		if (!target) return;
		this.logger.info(`${this.toString()} will protect ${target.toString()}`);
		this.visit(target);
		target.bodyguards.push(this);
		this.guarding = target;
	}

	shootout(attacker: Actor) {
		this.logger.info(`${this.toString()} defends their target from ${attacker.toString()}`);
		const shootoutEventGroup = new GameEventGroup(EventIds.BODYGUARD_SHOOTOUT);
		shootoutEventGroup.duration = Duration.SHOOTOUT;
		shootoutEventGroup.newEvent(
			new GameEvent(
				EventIds.BODYGUARD_SHOOTOUT,
				[BROADCAST_TARGET],
				'You hear sounds of a shootout',
			),
		);
		if (this.guarding) {
			shootoutEventGroup.newEvent(
				new GameEvent(
					EventIds.BODYGUARD_PROTECTED_TARGET,
					[this.guarding.input.id],
					'You were protected by a bodyguard',
				),
			);
		}
		shootoutEventGroup.newEvent(
			new GameEvent(
				EventIds.BODYGUARD_KILLED_ATTACKER,
				[attacker.input.id],
				'You were killed by the Bodyguard defending your target',
			),
		);
		shootoutEventGroup.newEvent(
			new GameEvent(
				EventIds.BODYGUARD_DIED_DEFENDING,
				[this.input.id],
				'You died defending your target',
			),
		);
		this.actionEvents.newEventGroup(shootoutEventGroup);
		this.die(DeathReasons.SHOOTOUT);
		attacker.die(DeathReasons.SHOOTOUT);
	}
}
