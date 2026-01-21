import type { EngineLogger } from '../logger';
import type { PlayerInput } from '../types';
import type { Rng } from '../utils';
import { CommonEvents, GameEvent, GameEventGroup } from '../events';

export type ActorContext = {
	logger: EngineLogger;
	actionEvents: GameEventGroup;
	rng: Rng;
};

type BodyguardActor = Actor & { shootout: (attacker: Actor) => void };
type DoctorActor = Actor & { reviveTarget: (target: Actor) => void };

export class Actor {
	static tags: string[] = ['any_random'];

	alignment: Alignment | null = null;
	player: PlayerInput;
	alias: string;
	number?: number;
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

	constructor(player: PlayerInput, context: ActorContext) {
		this.player = player;
		this.alias = player.alias;
		this.number = player.number;
		this.alive = player.alive;
		this.logger = context.logger;
		this.actionEvents = context.actionEvents;
		this.rng = context.rng;
	}

	get roleName() {
		return this.constructor.name;
	}

	dumpState() {
		return {
			...this.player,
			number: this.number,
			alive: this.alive,
			possibleTargets: this.possibleTargets.map((targetList) =>
				targetList.map((actor) => actor.number ?? 0),
			),
			targets: [],
			allies: this.allies.map((ally) => ({
				alias: ally.alias,
				number: ally.number ?? 0,
				role: ally.roleName,
				alive: Boolean(ally.alive),
			})),
			alias: this.alias,
		};
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
		this.logger.info(`${this} is visiting ${target}'s house`);
		this.visiting = target;
		target.visitors.push(this);
	}

	kill(
		target: Actor,
		success: () => void,
		fail: () => void,
		trueDeath = false,
	) {
		this.logger.info(`${this} is attempting to kill ${target}`);
		this.visit(target);

		if (target.bodyguards.length > 0) {
			const bodyguard = target.bodyguards.shift();
			if (bodyguard) bodyguard.shootout(this);
			return;
		}

		if (target.nightImmune) {
			this.logger.info(
				`${this} failed to kill ${target} because they are night-immune`,
			);
			fail();

			const surviveEventGroup = new GameEventGroup(CommonEvents.NIGHT_IMMUNE);
			surviveEventGroup.newEvent(
				new GameEvent(
					CommonEvents.NIGHT_IMMUNE,
					[target.player.id],
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
		this.logger.info(`${this} died. Cause of death: ${reason}`);
	}

	checkForWin(_actors: Actor[]) {
		return false;
	}
}

export enum Alignment {
	Town = 'Town',
	Mafia = 'Mafia',
}

export class Town extends Actor {
	constructor(player: PlayerInput, context: ActorContext) {
		super(player, context);
		this.alignment = Alignment.Town;
	}

	checkForWin(actors: Actor[]) {
		const enemies = actors.filter((actor) => actor.alignment === Alignment.Mafia);
		return enemies.length === 0;
	}
}

export class Mafia extends Actor {
	constructor(player: PlayerInput, context: ActorContext) {
		super(player, context);
		this.alignment = Alignment.Mafia;
		this.killReason = 'They were found riddled with bullets';
	}

	findAllies(actors: Actor[] = []) {
		this.allies = actors.filter((actor) => actor.alignment === this.alignment);
		return this.allies;
	}

	checkForWin(actors: Actor[]) {
		const enemies = actors.filter((actor) => !this.allies.includes(actor));
		return enemies.length === 0;
	}
}
