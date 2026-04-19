import { EngineError } from './error';
import { GameEventGroup } from './events';
import { EngineLogger } from './logger';
import {
	FALLBACK_ROLE,
	ROLE_PRIORITY,
	ROLE_TAGS_MAP,
	importRole,
	type RoleName,
} from './roles';
import { type Actor } from './roles/actor';
import {
	ActorStateInputSchema,
	EngineInputSchema,
	EngineOptionsSchema,
	GameConfigSchema,
	GameStateSchema,
	type ActorState,
	type EngineInput,
	type EngineResult,
	type GameConfig,
	type GameState,
	type WinnerSummary,
} from './types';
import { createRng, toSnakeCase, type Rng } from './utils';

type EngineContext = {
	logger: EngineLogger;
	rng: Rng;
};

const toValidationError = (error: unknown) =>
	new EngineError('engine.validation_error', 'Invalid engine input', error);

const parseInput = (input: EngineInput) => {
	try {
		return EngineInputSchema.parse(input);
	} catch (err) {
		throw toValidationError(err);
	}
};

const parseActors = (actors: ActorState[]) => {
	try {
		return actors.map((actor) => ActorStateInputSchema.parse(actor));
	} catch (err) {
		throw toValidationError(err);
	}
};

const parseConfig = (config: GameConfig) => {
	try {
		return GameConfigSchema.parse(config);
	} catch (err) {
		throw toValidationError(err);
	}
};

const parseState = (state: GameState) => {
	try {
		return GameStateSchema.parse(state);
	} catch (err) {
		throw toValidationError(err);
	}
};

type GenerateRolesResult = {
	roles: RoleName[];
	failedRoles: string[];
};

const generateRoles = (
	config: GameConfig,
	logger: EngineLogger,
	rng: Rng,
): GenerateRolesResult => {
	logger.info('--- Generating roles ---');
	logger.info(`Tags: ${JSON.stringify(config.tags)}`);

	const failedRoles: string[] = [];
	const roleOptions: Array<[string, Array<[RoleName, number, number]>]> = config.tags.map(
		(tag: string) => {
			const possibleRoles: Array<[RoleName, number, number]> = [];
			for (const [role, settings] of Object.entries(config.roles)) {
				const roleName = role as RoleName;
				const roleTags = ROLE_TAGS_MAP[roleName] ?? [];
				if (roleTags.includes(tag) || tag === role) {
					possibleRoles.push([roleName, settings.weight, settings.max]);
				}
			}
			return [tag, possibleRoles];
		},
	);

	roleOptions.sort((a, b) => {
		const aEmpty = a[1].length === 0 ? 1 : 0;
		const bEmpty = b[1].length === 0 ? 1 : 0;
		if (aEmpty !== bEmpty) return aEmpty - bEmpty;
		return a[1].length - b[1].length;
	});

	const selectedRoles: RoleName[] = [];
	const blacklist: RoleName[] = [];

	while (roleOptions.length > 0) {
		for (const [role, settings] of Object.entries(config.roles)) {
			const roleName = role as RoleName;
			const count = selectedRoles.filter((selected) => selected === roleName).length;
			if (count === settings.max && !blacklist.includes(roleName)) {
				logger.info(`- Max reached for '${roleName}' -> adding to blacklist`);
				blacklist.push(roleName);
				for (const option of roleOptions) {
					option[1] = option[1].filter((entry) => entry[0] !== roleName);
				}
			}
		}

		roleOptions.sort((a, b) => {
			const aEmpty = a[1].length === 0 ? 1 : 0;
			const bEmpty = b[1].length === 0 ? 1 : 0;
			if (aEmpty !== bEmpty) return aEmpty - bEmpty;
			return a[1].length - b[1].length;
		});

		const entry = roleOptions[0];
		if (!entry) {
			throw new Error('No role options available');
		}
		const [tag, options]: [string, Array<[RoleName, number, number]>] = entry;
		const availableRoles = options.filter(
			(role: [RoleName, number, number]) => !blacklist.includes(role[0]),
		);
		let choice: RoleName = FALLBACK_ROLE;

		if (availableRoles.length === 0) {
			logger.warn(`Picking ${tag}: ${choice} <--- FAILED!!!`);
			failedRoles.push(tag);
		} else {
			const roles = availableRoles.map((option: [RoleName, number, number]) => option[0]);
			const weights = availableRoles.map((option: [RoleName, number, number]) => option[1]);
			const [picked] = rng.choices(roles, weights, 1);
			if (!picked) {
				throw new Error('Failed to pick a role');
			}
			choice = picked;
			logger.info(`Picking ${tag}: ${choice}`);
		}

		selectedRoles.push(choice);
		roleOptions.shift();
	}

	if (failedRoles.length > 0) {
		logger.warn(`Number of failures: ${failedRoles.length}`);
	}
	logger.info(`Roles: ${JSON.stringify(selectedRoles)}`);
	return { roles: selectedRoles, failedRoles };
};

class Game {
	public actors: Actor[] = [];
	public events = new GameEventGroup('root');
	public actionEvents = new GameEventGroup('action');
	private graveyard: GameState['graveyard'] = [];

	constructor(
		public day: number,
		public actorInputs: ActorState[],
		public config: GameConfig,
		public context: EngineContext,
	) {
		this.context.logger.info('Importing required roles and instantiating actors');
		for (const actorInput of actorInputs) {
			if (!actorInput.role) {
				throw new EngineError(
					'engine.missing_role',
					'Actor role is required for game construction',
					{ actor: actorInput },
				);
			}
			const Role = importRole(actorInput.role);
			const settings = this.config.roles[actorInput.role]?.settings ?? {};
			const actor = new Role(actorInput, settings, {
				logger: this.context.logger,
				actionEvents: this.actionEvents,
				rng: this.context.rng,
			});
			this.actors.push(actor);
		}
		this.generateAlliesAndPossibleTargets();
	}

	static new(actorInputs: ActorState[], config: GameConfig, context: EngineContext) {
		context.logger.info('--- Creating a new Game ---');
		context.logger.info(`Actors: ${JSON.stringify(actorInputs)}`);

		const { roles } = generateRoles(config, context.logger, context.rng);
		const shuffledActors = context.rng.shuffle(
			actorInputs.map((actorInput) => ({ ...actorInput })),
		);
		const shuffledRoles = context.rng.shuffle(roles);

		if (shuffledActors.length > shuffledRoles.length) {
			shuffledRoles.push(
				...Array<RoleName>(shuffledActors.length - shuffledRoles.length).fill(FALLBACK_ROLE),
			);
		}

		context.logger.info('--- Allocating roles ---');
		for (const [index, actorInput] of shuffledActors.entries()) {
			actorInput.number = index + 1;
			const role = shuffledRoles[index] ?? FALLBACK_ROLE;
			actorInput.role = role;
			context.logger.info(
				`  |-> ${actorInput.alias} (${actorInput.name}):`.padEnd(40) +
				` ${actorInput.role}`,
			);
		}

		return new Game(1, shuffledActors, config, context);
	}

	static load(
		actorInputs: ActorState[],
		config: GameConfig,
		state: GameState,
		context: EngineContext,
	) {
		context.logger.info('--- Loading Game ---');
		context.logger.info(`Actors: ${JSON.stringify(actorInputs)}`);
		for (const actorInput of actorInputs) {
			context.logger.info(
				`  |-> ${actorInput.alias} (${actorInput.name}):`.padEnd(40) +
				` ${actorInput.role ?? 'Unknown'} ${actorInput.alive ? '' : '(DEAD)'}`,
			);
		}

		const game = new Game(state.day, actorInputs, config, context);
		game.graveyard = state.graveyard ?? [];
		game.applyTargetsFromInputs();
		return game;
	}

	private applyTargetsFromInputs() {
		for (const actor of this.actors) {
			const targets = (actor.input.targets ?? [])
				.map((targetNumber: number) => this.getActorByNumber(targetNumber))
				.filter((target: Actor | undefined): target is Actor => Boolean(target));
			actor.setTargets(targets);
		}
	}

	private generateAlliesAndPossibleTargets() {
		for (const actor of this.aliveActors) {
			actor.findAllies(this.actors);
			actor.findPossibleTargets(this.actors);
		}
	}

	lynch(number: number) {
		const actor = this.getActorByNumber(number);
		if (!actor) {
			throw new EngineError('engine.actor_not_found', 'Actor not found', { number });
		}
		actor.lynched();
	}

	resolve() {
		this.context.logger.info('--- Resolving all actor actions ---');
		this.day += 1;
		this.generateAlliesAndPossibleTargets();
		this.actors.sort(
			(a, b) =>
				(ROLE_PRIORITY[a.roleName as RoleName] ?? Infinity) -
				(ROLE_PRIORITY[b.roleName as RoleName] ?? Infinity),
		);

		for (const actor of this.actors) {
			if (actor.targets.length === 0) continue;
			if (actor.targets.length > 0 && actor.possibleTargets.length === 0) {
				this.context.logger.critical(
					`${actor.toString()} invalid targets (${actor.targets.map((t) => t.toString()).join(', ')})`,
				);
				this.context.logger.info('Clearing targets');
				actor.clearTargets();
				continue;
			}

			for (const [index, target] of actor.targets.entries()) {
				const possibleTargets = actor.possibleTargets[index] ?? [];
				if (possibleTargets.includes(target)) continue;
				this.context.logger.critical(
					`${actor.toString()} invalid targets (${target.toString()})`,
				);
				this.context.logger.info('Clearing targets');
				actor.clearTargets();
				break;
			}
		}

		for (const actor of this.actors) {
			if (actor.targets.length === 0 || !actor.alive) continue;
			this.context.logger.info(
				`${actor.toString()} is targetting ${actor.targets.map((t) => t.toString()).join(', ')}`,
			);
			this.actionEvents.reset(`${toSnakeCase(actor.roleName)}_action`);
			actor.doAction();
			if (this.actionEvents.events.length > 0) {
				this.events.newEventGroup(this.actionEvents.clone());
			}
		}
	}

	checkForWin() {
		this.context.logger.info('--- Checking for win conditions ---');
		const winners = this.actors.filter((actor) => actor.checkForWin(this.aliveActors));
		if (winners.length > 0) {
			this.context.logger.info(`Winners: ${winners.map((w) => w.alias).join(', ')}`);
			return winners;
		}
		this.context.logger.info('No winners found');
		return null;
	}

	getActorByNumber(number: number): Actor | undefined {
		return this.actors.find((actor) => actor.number === number);
	}

	get aliveActors() {
		return this.actors.filter((actor) => Boolean(actor.alive));
	}

	get deadActors() {
		return this.actors.filter((actor) => !actor.alive);
	}

	private requireNumber(actor: Actor): number {
		if (actor.number === undefined) {
			throw new EngineError('engine.missing_number', 'Actor number is required', {
				actor: actor.alias,
			});
		}
		return actor.number;
	}

	get fullGraveyard() {
		return [
			...this.graveyard,
			...this.deadActors.map((actor) => ({
				number: this.requireNumber(actor),
				alias: actor.alias,
				cod: actor.cod ?? 'Unknown',
				dod: this.day,
				role: actor.roleName,
				will: 'actor.will',
				alignment: actor.alignment ?? 'Town' as const,
			})),
		];
	}

	get state(): GameState {
		return {
			day: this.day,
			actors: this.actors.map((actor) => ({
				number: this.requireNumber(actor),
				alias: actor.alias,
				alive: Boolean(actor.alive),
			})),
			graveyard: this.fullGraveyard,
		};
	}

	dumpActors() {
		return this.actors.map((actor) => actor.dumpState());
	}
}

const buildResult = (game: Game, winners: WinnerSummary[] | null, logger: EngineLogger) => ({
	state: game.state,
	actors: game.dumpActors(),
	events: game.events.dump(),
	winners,
	log: logger.output,
});

const summarizeWinners = (winners: ReturnType<Game['checkForWin']>): WinnerSummary[] | null => {
	if (!winners || winners.length === 0) return null;
	return winners.map((winner) => {
		if (winner.number === undefined) {
			throw new EngineError('engine.missing_number', 'Winner must have a number', {
				actor: winner.alias,
			});
		}
		return {
			id: winner.input.id,
			name: winner.input.name,
			alias: winner.alias,
			number: winner.number,
			role: winner.roleName,
			alignment: winner.alignment ?? 'Town' as const,
		};
	});
};

export const newGame = (input: EngineInput): EngineResult => {
	const parsed = parseInput(input);
	const logger = new EngineLogger();
	const options = EngineOptionsSchema.parse(parsed.options ?? {});
	const rng = createRng(options.seed);
	const actors = parseActors(parsed.actors);
	const config = parseConfig(parsed.config);

	const game = Game.new(actors, config, { logger, rng });
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

export const loadGame = (input: EngineInput): EngineResult => {
	const parsed = parseInput(input);
	if (!parsed.state) {
		throw new EngineError('engine.missing_state', 'State is required to load a game');
	}
	const logger = new EngineLogger();
	const options = EngineOptionsSchema.parse(parsed.options ?? {});
	const rng = createRng(options.seed);
	const actors = parseActors(parsed.actors);
	const config = parseConfig(parsed.config);
	const state = parseState(parsed.state);

	const game = Game.load(actors, config, state, { logger, rng });
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

export const resolveGame = (input: EngineInput): EngineResult => {
	const parsed = parseInput(input);
	if (!parsed.state) {
		throw new EngineError('engine.missing_state', 'State is required to resolve a game');
	}
	const logger = new EngineLogger();
	const options = EngineOptionsSchema.parse(parsed.options ?? {});
	const rng = createRng(options.seed);
	const actors = parseActors(parsed.actors);
	const config = parseConfig(parsed.config);
	const state = parseState(parsed.state);

	const game = Game.load(actors, config, state, { logger, rng });
	game.resolve();
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};
