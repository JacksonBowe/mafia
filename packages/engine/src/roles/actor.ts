import {
	BROADCAST_TARGET,
	DeathReasons,
	EngineErrorCodes,
	EventIds,
} from '../constants';
import type { ActorContext } from '../context';
import { EngineError } from '../error';
import { Duration, GameEvent, GameEventGroup } from '../events';
import type { EngineLogger } from '../logger';
import type { ActorAlignment, ActorState, Ally } from '../types';
import type { Rng } from '../utils';
import type { RoleName } from './constants';

export type { ActorContext } from '../context';

type BodyguardActor = Actor & { shootout: (attacker: Actor) => void };
type DoctorActor = Actor & { reviveTarget: (target: Actor) => void };

export class Actor {
	static tags: string[] = ['any_random'];
	/**
	 * Subclasses MUST override with their own role name. The static field is
	 * the source of truth for {@link Actor.roleName} (minify-safe; does not rely
	 * on `this.constructor.name`).
	 */
	static roleName: RoleName = 'Citizen';
	/**
	 * Action-resolution priority. Lower runs first. Subclasses override.
	 * Used to derive the {@link ROLE_PRIORITY} table.
	 */
	static priority = 0;

	alignment: ActorAlignment | null = null;
	input: ActorState;
	alias: string;
	number?: number | undefined;
	alive: boolean;
	allies: Actor[] = [];
	possibleTargets: Actor[][] = [];
	visitors: Actor[] = [];
	bodyguards: BodyguardActor[] = [];
	doctors: DoctorActor[] = [];
	nightImmune = false;
	visiting: Actor | null = null;
	killReason: string = DeathReasons.UNKNOWN_LONG;
	targets: Actor[] = [];
	cod?: string;

	protected readonly logger: EngineLogger;
	protected readonly actionEvents: GameEventGroup;
	protected readonly rng: Rng;

	constructor(input: ActorState, context: ActorContext) {
		this.input = input;
		this.alias = input.alias;
		this.number = input.number;
		this.alive = input.alive;
		this.logger = context.logger;
		this.actionEvents = context.actionEvents;
		this.rng = context.rng;
	}

	get roleName(): RoleName {
		return (this.constructor as typeof Actor).roleName;
	}

	/**
	 * Strict accessor for `number`. Throws an {@link EngineError} when the actor
	 * has no number assigned yet — preferred over `??` fallbacks that would
	 * fail downstream Zod validation.
	 */
	requireNumber(): number {
		if (this.number === undefined) {
			throw new EngineError(
				EngineErrorCodes.MISSING_NUMBER,
				`Actor "${this.alias}" has no assigned number`,
				{ alias: this.alias },
			);
		}
		return this.number;
	}

	dumpState(): ActorState {
		return {
			id: this.input.id,
			name: this.input.name,
			alias: this.alias,
			role: this.roleName,
			possibleTargets: this.possibleTargets.map((targetList) =>
				targetList.map((actor) => actor.requireNumber()),
			),
			alive: this.alive,
			number: this.number,
			alignment: this.alignment,
			targets: this.targets.map((target) => target.requireNumber()),
			allies: this.allies.map(
				(ally): Ally => ({
					alias: ally.alias,
					number: ally.requireNumber(),
					role: ally.roleName,
					alive: ally.alive,
				}),
			),
			roleActions: this.input.roleActions,
			...(this.input.will !== undefined ? { will: this.input.will } : {}),
		};
	}

	toString() {
		return `|${this.roleName}| ${this.alias}(${this.number ?? '?'})`;
	}

	findAllies(_actors: Actor[] = []): Actor[] {
		this.allies = [];
		return this.allies;
	}

	findPossibleTargets(_actors: Actor[] = []): Actor[][] {
		this.possibleTargets = [];
		return this.possibleTargets;
	}

	/**
	 * Helper for roles that pick a single target. Sets `possibleTargets` to a
	 * one-slot list filtered by `predicate` and returns it.
	 */
	protected setSingleTarget(actors: Actor[], predicate: (actor: Actor) => boolean) {
		this.possibleTargets = [actors.filter(predicate)];
		return this.possibleTargets;
	}

	setTargets(targets: Actor[]) {
		this.targets = targets;
	}

	clearTargets() {
		this.targets = [];
	}

	doAction() {
		this.action();
	}

	action(): void {
		throw new EngineError(
			EngineErrorCodes.ACTION_NOT_IMPLEMENTED,
			`action() not implemented for role "${this.roleName}"`,
			{ role: this.roleName },
		);
	}

	visit(target: Actor) {
		this.logger.info(`${this.toString()} is visiting ${target.toString()}'s house`);
		this.visiting = target;
		target.visitors.push(this);
	}

	kill(target: Actor, success: () => void, fail: () => void, trueDeath = false) {
		this.logger.info(`${this.toString()} is attempting to kill ${target.toString()}`);
		this.visit(target);

		if (target.bodyguards.length > 0) {
			const bodyguard = target.bodyguards.shift();
			if (bodyguard) bodyguard.shootout(this);
			return;
		}

		if (target.nightImmune) {
			this.logger.info(
				`${this.toString()} failed to kill ${target.toString()} because they are night-immune`,
			);
			fail();

			const surviveEventGroup = new GameEventGroup(EventIds.NIGHT_IMMUNE);
			surviveEventGroup.newEvent(
				new GameEvent(
					EventIds.NIGHT_IMMUNE,
					[target.input.id],
					'You were attacked tonight but survived due to Night Immunity',
				),
			);
			this.actionEvents.newEventGroup(surviveEventGroup);
			return;
		}

		success();
		target.die(this.killReason, trueDeath);
	}

	lynched() {
		this.die(DeathReasons.LYNCHED, true);
	}

	die(reason: string = DeathReasons.UNKNOWN, trueDeath = false) {
		this.doctors = this.doctors.filter((doctor) => doctor.alive);
		this.alive = false;
		if (!trueDeath && this.doctors.length > 0) {
			const doctor = this.doctors.shift();
			if (doctor) {
				doctor.reviveTarget(this);
				this.alive = true;
				return;
			}
		}
		this.cod = reason;
		this.logger.info(`${this.toString()} died. Cause of death: ${reason}`);
	}

	checkForWin(_actors: Actor[]): boolean {
		return false;
	}
}

export class Town extends Actor {
	constructor(input: ActorState, context: ActorContext) {
		super(input, context);
		this.alignment = 'Town';
	}

	override checkForWin(actors: Actor[]) {
		const enemies = actors.filter((actor) => actor.alignment === 'Mafia');
		return enemies.length === 0;
	}
}

export class Mafia extends Actor {
	constructor(input: ActorState, context: ActorContext) {
		super(input, context);
		this.alignment = 'Mafia';
		this.killReason = DeathReasons.MAFIA_KILL;
	}

	override findAllies(actors: Actor[] = []) {
		this.allies = actors.filter((actor) => actor.alignment === this.alignment);
		return this.allies;
	}

	override checkForWin(actors: Actor[]) {
		const enemies = actors.filter((actor) => !this.allies.includes(actor));
		return enemies.length === 0;
	}

	/**
	 * Builds the standard Mafia kill success/fail event group callbacks and
	 * dispatches `kill()` against the chosen target. `idPrefix` distinguishes
	 * the originating role (e.g. `mafioso`, `godfather`).
	 */
	protected mafiaKill(target: Actor, idPrefix: 'mafioso' | 'godfather') {
		const success = () => {
			const group = new GameEventGroup(`${idPrefix}_action_success`);
			group.duration = Duration.MAFIA_KILL;
			group.newEvent(
				new GameEvent(
					`${idPrefix}_kill_success`,
					[BROADCAST_TARGET],
					'There are sounds of shots in the streets',
				),
			);
			group.newEvent(
				new GameEvent(
					EventIds.KILLED_BY_MAFIA,
					[target.input.id],
					'You were killed by a member of the Mafia',
				),
			);
			this.actionEvents.newEventGroup(group);
		};

		const fail = () => {
			const group = new GameEventGroup(`${idPrefix}_action_fail`);
			group.duration = Duration.MAFIA_KILL;
			group.newEvent(new GameEvent(`${idPrefix}_kill_fail`, [BROADCAST_TARGET], ''));
			this.actionEvents.newEventGroup(group);
		};

		this.kill(target, success, fail);
	}
}
