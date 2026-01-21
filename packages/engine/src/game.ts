import { InputError } from '@mafia/core/error';
import { GameEventGroup } from './events';
import { EngineLogger } from './logger';
import { ROLE_LIST, ROLE_TAGS_MAP, importRole } from './roles';
import { Alignment, type Actor } from './roles/actor';
import {
	EngineInputSchema,
	EngineOptionsSchema,
	GameConfigSchema,
	GameStateSchema,
	PlayerSchema,
	type EngineInput,
	type EngineResult,
	type GameConfigInput,
	type GameStateInput,
	type PlayerInput,
	type RoleSettings,
	type WinnerSummary,
} from './types';
import { createRng, toSnakeCase, type Rng } from './utils';

type EngineContext = {
	logger: EngineLogger;
	rng: Rng;
};

const toValidationError = (error: unknown) =>
	new InputError('engine.validation_error', 'Invalid engine input', error);

const parseInput = (input: EngineInput) => {
	try {
		return EngineInputSchema.parse(input);
	} catch (err) {
		throw toValidationError(err);
	}
};

const parsePlayers = (players: PlayerInput[]) => {
	try {
		return players.map((player) => PlayerSchema.parse(player));
	} catch (err) {
		throw toValidationError(err);
	}
};

const parseConfig = (config: GameConfigInput) => {
	try {
		return GameConfigSchema.parse(config);
	} catch (err) {
		throw toValidationError(err);
	}
};

const parseState = (state: GameStateInput) => {
	try {
		return GameStateSchema.parse(state);
	} catch (err) {
		throw toValidationError(err);
	}
};

const generateRoles = (config: GameConfigInput, logger: EngineLogger, rng: Rng) => {
	logger.info('--- Generating roles ---');
	logger.info(`Tags: ${JSON.stringify(config.tags)}`);

	const failedRoles: string[] = [];
	const roleOptions: Array<[string, Array<[string, number, number]>]> = config.tags.map(
		(tag: string) => {
			const possibleRoles: Array<[string, number, number]> = [];
			for (const [role, settings] of Object.entries(config.roles) as Array<
				[string, RoleSettings]
			>) {
				const roleTags = ROLE_TAGS_MAP[role] ?? [];
				if (roleTags.includes(tag) || tag === role) {
					possibleRoles.push([role, settings.weight, settings.max]);
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

	const selectedRoles: string[] = [];
	const blacklist: string[] = [];

	while (roleOptions.length > 0) {
		for (const [role, settings] of Object.entries(config.roles) as Array<
			[string, RoleSettings]
		>) {
			const count = selectedRoles.filter((selected) => selected === role).length;
			if (count === settings.max && !blacklist.includes(role)) {
				logger.info(`- Max reached for '${role}' -> adding to blacklist`);
				blacklist.push(role);
				for (const option of roleOptions) {
					option[1] = option[1].filter((entry) => entry[0] !== role);
				}
			}
		}

		roleOptions.sort((a, b) => {
			const aEmpty = a[1].length === 0 ? 1 : 0;
			const bEmpty = b[1].length === 0 ? 1 : 0;
			if (aEmpty !== bEmpty) return aEmpty - bEmpty;
			return a[1].length - b[1].length;
		});

		const [tag, options] = roleOptions[0];
		const availableRoles = options.filter((role) => !blacklist.includes(role[0]));
		let choice = 'Citizen';

		if (availableRoles.length === 0) {
			logger.warn(`Picking ${tag}: ${choice} <--- FAILED!!!`);
			failedRoles.push(tag);
		} else {
			const roles = availableRoles.map((option) => option[0]);
			const weights = availableRoles.map((option) => option[1]);
			choice = rng.choices(roles, weights, 1)[0];
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
	private graveyard: GameStateInput['graveyard'] = [];

	constructor(
		public day: number,
		public players: PlayerInput[],
		public config: GameConfigInput,
		public context: EngineContext,
	) {
		this.context.logger.info('Importing required roles and instantiating actors');
		for (const player of players) {
			if (!player.role) {
				throw new InputError(
					'engine.missing_role',
					'Player role is required for game construction',
					{ player },
				);
			}
			const Role = importRole(player.role);
			const settings = this.config.roles[player.role]?.settings ?? {};
			const actor = new Role(player, settings, {
				logger: this.context.logger,
				actionEvents: this.actionEvents,
				rng: this.context.rng,
			});
			this.actors.push(actor);
		}
		this.generateAlliesAndPossibleTargets();
	}

	static new(players: PlayerInput[], config: GameConfigInput, context: EngineContext) {
		context.logger.info('--- Creating a new Game ---');
		context.logger.info(`Players: ${JSON.stringify(players)}`);

		const { roles } = generateRoles(config, context.logger, context.rng);
		const shuffledPlayers = context.rng.shuffle(players.map((player) => ({ ...player })));
		const shuffledRoles = context.rng.shuffle(roles);

		if (shuffledPlayers.length > shuffledRoles.length) {
			shuffledRoles.push(
				...Array(shuffledPlayers.length - shuffledRoles.length).fill('Citizen'),
			);
		}

		context.logger.info('--- Allocating roles ---');
		for (const [index, player] of shuffledPlayers.entries()) {
			player.number = index + 1;
			player.role = shuffledRoles[index];
			context.logger.info(
				`  |-> ${player.alias} (${player.name}):`.padEnd(40) + ` ${player.role}`,
			);
		}

		return new Game(1, shuffledPlayers, config, context);
	}

	static load(
		players: PlayerInput[],
		config: GameConfigInput,
		state: GameStateInput,
		context: EngineContext,
	) {
		context.logger.info('--- Loading Game ---');
		context.logger.info(`Players: ${JSON.stringify(players)}`);
		for (const player of players) {
			context.logger.info(
				`  |-> ${player.alias} (${player.name}):`.padEnd(40) +
					` ${player.role ?? 'Unknown'} ${player.alive ? '' : '(DEAD)'}`,
			);
		}

		const game = new Game(state.day, players, config, context);
		game.graveyard = state.graveyard ?? [];
		game.applyTargetsFromPlayers();
		return game;
	}

	private applyTargetsFromPlayers() {
		for (const actor of this.actors) {
			const targets = (actor.player.targets ?? [])
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
			throw new InputError('engine.actor_not_found', 'Actor not found', { number });
		}
		actor.lynched();
	}

	resolve() {
		this.context.logger.info('--- Resolving all player actions ---');
		this.day += 1;
		this.generateAlliesAndPossibleTargets();
		this.actors.sort(
			(a, b) => ROLE_LIST.indexOf(a.constructor as (typeof ROLE_LIST)[number]) -
				ROLE_LIST.indexOf(b.constructor as (typeof ROLE_LIST)[number]),
		);

		for (const actor of this.actors) {
			if (actor.targets.length === 0) continue;
			if (actor.targets.length > 0 && actor.possibleTargets.length === 0) {
				this.context.logger.critical(`${actor} invalid targets (${actor.targets})`);
				this.context.logger.info('Clearing targets');
				actor.clearTargets();
				continue;
			}

			for (const [index, target] of actor.targets.entries()) {
				const possibleTargets = actor.possibleTargets[index] ?? [];
				if (possibleTargets.includes(target)) continue;
				this.context.logger.critical(`${actor} invalid targets (${target})`);
				this.context.logger.info('Clearing targets');
				actor.clearTargets();
				break;
			}
		}

		for (const actor of this.actors) {
			if (actor.targets.length === 0 || !actor.alive) continue;
			this.context.logger.info(`${actor} is targetting ${actor.targets}`);
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

	get fullGraveyard() {
		return [
			...this.graveyard,
			...this.deadActors.map((actor) => ({
				number: actor.number ?? 0,
				alias: actor.alias,
				cod: actor.cod ?? 'Unknown',
				dod: this.day,
				role: actor.roleName,
				will: 'actor.will',
			})),
		];
	}

	get state(): GameStateInput {
		return {
			day: this.day,
			players: this.actors.map((actor) => ({
				number: actor.number ?? 0,
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

const buildResult = (
	game: Game,
	winners: WinnerSummary[] | null,
	logger: EngineLogger,
) => ({
	state: game.state,
	actors: game.dumpActors(),
	events: game.events.dump(),
	winners,
	log: logger.output,
});

const summarizeWinners = (winners: ReturnType<Game['checkForWin']>): WinnerSummary[] | null => {
	if (!winners || winners.length === 0) return null;
	return winners.map((winner) => ({
		id: winner.player.id,
		name: winner.player.name,
		alias: winner.alias,
		number: winner.number ?? 0,
		role: winner.roleName,
		alignment: (winner.alignment ?? Alignment.Town) as WinnerSummary['alignment'],
	}));
};

export const newGame = (input: EngineInput): EngineResult => {
	const parsed = parseInput(input);
	const logger = new EngineLogger();
	const options = EngineOptionsSchema.parse(parsed.options ?? {});
	const rng = createRng(options.seed);
	const players = parsePlayers(parsed.players);
	const config = parseConfig(parsed.config);

	const game = Game.new(players, config, { logger, rng });
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

export const loadGame = (input: EngineInput): EngineResult => {
	const parsed = parseInput(input);
	if (!parsed.state) {
		throw new InputError('engine.missing_state', 'State is required to load a game');
	}
	const logger = new EngineLogger();
	const options = EngineOptionsSchema.parse(parsed.options ?? {});
	const rng = createRng(options.seed);
	const players = parsePlayers(parsed.players);
	const config = parseConfig(parsed.config);
	const state = parseState(parsed.state);

	const game = Game.load(players, config, state, { logger, rng });
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

export const resolveGame = (input: EngineInput): EngineResult => {
	const parsed = parseInput(input);
	if (!parsed.state) {
		throw new InputError('engine.missing_state', 'State is required to resolve a game');
	}
	const logger = new EngineLogger();
	const options = EngineOptionsSchema.parse(parsed.options ?? {});
	const rng = createRng(options.seed);
	const players = parsePlayers(parsed.players);
	const config = parseConfig(parsed.config);
	const state = parseState(parsed.state);

	const game = Game.load(players, config, state, { logger, rng });
	game.resolve();
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};
