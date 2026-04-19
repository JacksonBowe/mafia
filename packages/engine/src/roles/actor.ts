import { CommonEvents, GameEvent, GameEventGroup } from '../events';
import type { EngineLogger } from '../logger';
import type { ActorAlignment, ActorState } from '../types';
import type { RoleName } from './index';
import type { Rng } from '../utils';

export type ActorContext = {
	logger: EngineLogger;
	actionEvents: GameEventGroup;
	rng: Rng;
};

type BodyguardActor = Actor & { shootout: (attacker: Actor) => void };
type DoctorActor = Actor & { reviveTarget: (target: Actor) => void };

export class Actor {
	static tags: string[] = ['any_random'];

	alignment: ActorAlignment | null = null;
	input: ActorState;
	alias: string;
	number?: number | undefined;
	alive?: boolean;
	allies: Actor[] = [];
	possibleTargets: Array<Array<Actor>> = [];
	visitors: Actor[] = [];
	bodyguards: BodyguardActor[] = [];
	doctors: DoctorActor[] = [];
	nightImmune = false;
	visiting: Actor | null = null;
	killReason = 'How they died is unknown';
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
		return this.constructor.name as RoleName;
	}

	dumpState() {
		const state: ActorState = {
			id: this.input.id,
			name: this.input.name,
			alias: this.alias,
			role: this.input.role ?? this.roleName,
			possibleTargets: this.possibleTargets.map((targetList) =>
				targetList.map((actor) => actor.number ?? 0),
			),
			alive: this.alive ?? true,
			number: this.number,
			alignment: this.alignment,
			targets: [],
			allies: this.allies.map((ally) => ({
				alias: ally.alias,
				number: ally.number ?? 0,
				role: ally.roleName,
				alive: Boolean(ally.alive),
			})),
			roleActions: this.input.roleActions,
		};
		// if (this.number !== undefined) {
		// 	state.number = this.number;
		// }
		// if (this.alive !== undefined) {
		// 	state.alive = this.alive;
		// }
		return state;
	}

	toString() {
		return `|${this.roleName}| ${this.alias}(${this.number ?? '?'})`;
	}

	findAllies(_actors: Actor[] = []) {
		this.allies = [];
		return this.allies;
	}

	findPossibleTargets(_actors: Actor[] = []) {
		this.possibleTargets = [];
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

	action() {
		throw new Error('Not implemented');
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

			const surviveEventGroup = new GameEventGroup(CommonEvents.NIGHT_IMMUNE);
			surviveEventGroup.newEvent(
				new GameEvent(
					CommonEvents.NIGHT_IMMUNE,
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
		this.die('They were lynched', true);
	}

	die(reason = 'Unknown', trueDeath = false) {
		this.doctors = this.doctors.filter((doctor) => Boolean(doctor.alive));
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

	checkForWin(_actors: Actor[]) {
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
		this.killReason = 'They were found riddled with bullets';
	}

	override findAllies(actors: Actor[] = []) {
		this.allies = actors.filter((actor) => actor.alignment === this.alignment);
		return this.allies;
	}

	override checkForWin(actors: Actor[]) {
		const enemies = actors.filter((actor) => !this.allies.includes(actor));
		return enemies.length === 0;
	}
}
