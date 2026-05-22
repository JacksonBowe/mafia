import type { z } from 'zod';
import { DEFAULT_ALIGNMENT, EngineErrorCodes, EventGroupIds } from './constants';
import type { EngineContext } from './context';
import { EngineError } from './error';
import { GameEventGroup } from './events';
import { EngineLogger } from './logger';
import {
	FALLBACK_ROLE,
	ROLE_PRIORITY,
	ROLE_TAGS_MAP,
	instantiateRole,
	type RoleName,
} from './roles';
import { type Actor } from './roles/actor';
import {
	EngineInputSchema,
	type ActorState,
	type EngineInput,
	type EngineResult,
	type GameConfig,
	type GameState,
	type WinnerSummary,
} from './types';
import { createRng, toSnakeCase, type Rng } from './utils';

const toValidationError = (error: unknown) =>
	new EngineError(EngineErrorCodes.VALIDATION_ERROR, 'Invalid engine input', error);

const parseWith = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> => {
	try {
		return schema.parse(value);
	} catch (err) {
		throw toValidationError(err);
	}
};

type RoleOption = readonly [RoleName, number, number];
type TagRoleOptions = [string, RoleOption[]];

const compareRoleOptionEntries = (a: TagRoleOptions, b: TagRoleOptions) => {
	const aEmpty = a[1].length === 0 ? 1 : 0;
	const bEmpty = b[1].length === 0 ? 1 : 0;
	if (aEmpty !== bEmpty) return aEmpty - bEmpty;
	return a[1].length - b[1].length;
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
	const roleOptions: TagRoleOptions[] = config.tags.map((tag) => {
		const possibleRoles: RoleOption[] = [];
		for (const [roleName, settings] of Object.entries(config.roles) as Array<
			[RoleName, GameConfig['roles'][RoleName] & {}]
		>) {
			if (!settings) continue;
			const roleTags = ROLE_TAGS_MAP[roleName] ?? [];
			if (roleTags.includes(tag)) {
				possibleRoles.push([roleName, settings.weight, settings.max]);
			}
		}
		return [tag, possibleRoles];
	});

	roleOptions.sort(compareRoleOptionEntries);

	const selectedRoles: RoleName[] = [];
	const blacklist = new Set<RoleName>();

	while (roleOptions.length > 0) {
		for (const [roleName, settings] of Object.entries(config.roles) as Array<
			[RoleName, GameConfig['roles'][RoleName] & {}]
		>) {
			if (!settings) continue;
			const count = selectedRoles.filter((selected) => selected === roleName).length;
			if (count === settings.max && !blacklist.has(roleName)) {
				logger.info(`- Max reached for '${roleName}' -> adding to blacklist`);
				blacklist.add(roleName);
				for (const option of roleOptions) {
					option[1] = option[1].filter((entry) => entry[0] !== roleName);
				}
			}
		}

		roleOptions.sort(compareRoleOptionEntries);

		const entry = roleOptions[0];
		if (!entry) {
			throw new EngineError(
				EngineErrorCodes.NO_ROLE_OPTIONS,
				'No role options available',
			);
		}
		const [tag, options] = entry;
		const availableRoles = options.filter((role) => !blacklist.has(role[0]));
		let choice: RoleName = FALLBACK_ROLE;

		if (availableRoles.length === 0) {
			logger.warn(`Picking ${tag}: ${choice} <--- FAILED!!!`);
			failedRoles.push(tag);
		} else {
			const roles = availableRoles.map((option) => option[0]);
			const weights = availableRoles.map((option) => option[1]);
			const [picked] = rng.choices(roles, weights, 1);
			if (!picked) {
				throw new EngineError(
					EngineErrorCodes.ROLE_PICK_FAILED,
					'Failed to pick a role',
					{ tag, roles, weights },
				);
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
	public events = new GameEventGroup(EventGroupIds.ROOT);
	public actionEvents = new GameEventGroup(EventGroupIds.ACTION);
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
					EngineErrorCodes.MISSING_ROLE,
					'Actor role is required for game construction',
					{ actor: actorInput },
				);
			}
			const settings = this.config.roles[actorInput.role]?.settings ?? {};
			const actor = instantiateRole(actorInput.role, actorInput, settings, {
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
				`  |-> ${actorInput.alias} (${actorInput.name}):`.padEnd(40) + ` ${actorInput.role}`,
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
		game.graveyard = state.graveyard;
		game.applyTargetsFromInputs();
		return game;
	}

	private applyTargetsFromInputs() {
		for (const actor of this.actors) {
			const targets = (actor.input.targets ?? [])
				.map((targetNumber) => this.getActorByNumber(targetNumber))
				.filter((target): target is Actor => target !== undefined);
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
			throw new EngineError(EngineErrorCodes.ACTOR_NOT_FOUND, 'Actor not found', { number });
		}
		actor.lynched();
	}

	resolve() {
		this.context.logger.info('--- Resolving all actor actions ---');
		this.day += 1;
		this.generateAlliesAndPossibleTargets();
		this.actors = [...this.actors].sort(
			(a, b) =>
				(ROLE_PRIORITY[a.roleName] ?? Number.POSITIVE_INFINITY) -
				(ROLE_PRIORITY[b.roleName] ?? Number.POSITIVE_INFINITY),
		);

		for (const actor of this.actors) {
			if (actor.targets.length === 0) continue;
			if (actor.possibleTargets.length === 0) {
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
		// Scenarios:
		// 1. An actor/s that can trigger game over meets win conditions -> that actor/s wins immediately + all coWinners who have met their win conditions
		// 2. There are no actors that can trigger a game over, but all coWinners have met their win conditions -> all coWinners win immediately
		// 3. There are no actors that can trigger a game over, and not all coWinners have met their win conditions -> no winners
		// 4. There is only one actor left alive -> game is over -> anyone who meets win condition is a winner

		this.context.logger.info('--- Checking for win conditions ---');

		const primaryWinCandidates = this.actors.filter((actor) => actor.canTriggerGameOver);
		const coWinCandidates = this.actors.filter((actor) => !actor.canTriggerGameOver);

		const primaryWinners = primaryWinCandidates.filter((actor) =>
			actor.checkForWin(this.actors),
		);

		const coWinners = coWinCandidates.filter((actor) =>
			actor.checkForWin(this.actors),
		);

		const winners = [...primaryWinners, ...coWinners];

		// console.log('Primary win candidates', primaryWinCandidates.map((a) => a.toString()));
		// console.log('Co win candidates', coWinCandidates.map((a) => a.toString()));
		// console.log('Primary winners', primaryWinners.map((a) => a.toString()));
		// console.log('Co winners', coWinners.map((a) => a.toString()));

		// Scenario 1:
		// If any primary actor wins, game over immediately.
		// Include any co-winners who have also met their win conditions.
		if (primaryWinners.length > 0) {
			this.context.logger.info(`Winners: ${winners.map((w) => w.alias).join(', ')}`);
			return winners;
		}

		// Scenario 4:
		// If only one actor is left alive, the game is over.
		// Return anyone who currently meets their win condition.
		const livingActors = this.actors.filter((actor) => actor.alive);

		if (livingActors.length === 1) {
			if (winners.length > 0) {
				this.context.logger.info(
					'Only one actor left alive, game over',
				);

				this.context.logger.info(`Winners: ${winners.map((w) => w.alias).join(', ')}`);

				return winners;
			}

			this.context.logger.info(
				'Only one actor left alive, but no actors meet their win conditions',
			);

			return null;
		}

		// Scenario 2:
		// If there are no living primary actors left, all co-winners must have met their win conditions.
		const livingPrimaryWinCandidates = primaryWinCandidates.filter(
			(actor) => actor.alive,
		);

		if (
			livingPrimaryWinCandidates.length === 0 &&
			coWinCandidates.length > 0 &&
			coWinners.length === coWinCandidates.length
		) {
			this.context.logger.info(
				'All actors that cannot trigger game over have won, game over',
			);

			this.context.logger.info(`Winners: ${coWinners.map((w) => w.alias).join(', ')}`);

			return coWinners;
		}

		// Scenario 3:
		this.context.logger.info('No winners found');

		return null;
	}

	getActorByNumber(number: number): Actor | undefined {
		return this.actors.find((actor) => actor.number === number);
	}

	get aliveActors() {
		return this.actors.filter((actor) => actor.alive);
	}

	private get deadActors() {
		return this.actors.filter((actor) => !actor.alive);
	}

	get fullGraveyard(): GameState['graveyard'] {
		return [
			...this.graveyard,
			...this.deadActors.map((actor) => ({
				number: actor.requireNumber(),
				alias: actor.alias,
				cod: actor.cod ?? 'Unknown',
				dod: this.day,
				role: actor.roleName,
				will: actor.input.will ?? '',
				alignment: actor.alignment ?? DEFAULT_ALIGNMENT,
			})),
		];
	}

	get state(): GameState {
		return {
			day: this.day,
			actors: this.actors.map((actor) => ({
				number: actor.requireNumber(),
				alias: actor.alias,
				alive: actor.alive,
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
	return winners.map((winner) => ({
		id: winner.input.id,
		name: winner.input.name,
		alias: winner.alias,
		number: winner.requireNumber(),
		role: winner.roleName,
		alignment: winner.alignment ?? DEFAULT_ALIGNMENT,
	}));
};

type Bootstrap = {
	parsed: EngineInput;
	context: EngineContext;
	logger: EngineLogger;
	actors: ActorState[];
	config: GameConfig;
};

/**
 * Validate the engine input once at the boundary and derive all per-call
 * resources. Subsequent code consumes already-parsed values, so no further
 * Zod parsing is required.
 */
const bootstrap = (input: EngineInput): Bootstrap => {
	const parsed = parseWith(EngineInputSchema, input);
	const logger = new EngineLogger();
	const rng = createRng(parsed.options?.seed);
	return {
		parsed,
		context: { logger, rng },
		logger,
		actors: parsed.actors,
		config: parsed.config,
	};
};

const requireState = (input: EngineInput, action: 'load' | 'resolve'): GameState => {
	if (!input.state) {
		throw new EngineError(
			EngineErrorCodes.MISSING_STATE,
			`State is required to ${action} a game`,
		);
	}
	return input.state;
};

export const newGame = (input: EngineInput): EngineResult => {
	const { context, logger, actors, config } = bootstrap(input);
	const game = Game.new(actors, config, context);
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

export const loadGame = (input: EngineInput): EngineResult => {
	const { parsed, context, logger, actors, config } = bootstrap(input);
	const state = requireState(parsed, 'load');
	const game = Game.load(actors, config, state, context);
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

export const resolveGame = (input: EngineInput): EngineResult => {
	const { parsed, context, logger, actors, config } = bootstrap(input);
	const state = requireState(parsed, 'resolve');
	const game = Game.load(actors, config, state, context);
	game.resolve();
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

export { Game };
