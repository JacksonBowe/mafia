import { DEFAULT_ALIGNMENT, EngineErrorCodes, EventGroupIds } from './constants';
import type { EngineContext } from './context';
import { EngineError } from './error';
import { GameEventGroup } from './events';
import type { EngineLogger } from './logger';
import {
	FALLBACK_ROLE,
	instantiateRole,
	ROLE_KEY_BY_NAME,
	ROLE_TAGS_MAP,
	RoleNamesAndPriorityOrder,
	type RoleName,
} from './roles';
import { type Actor, type ActorState } from './roles/actor';
import { type GameConfig, type GameState } from './types';
import { toSnakeCase, type Rng } from './utils';

// ---------------------------------------------------------------------------
// Role generation
//
// Roles are not assigned directly. Each game has a list of `tags` (one per
// seat). For every tag we collect the roles allowed under it, then pick one
// role per tag using weighted random choice. `max` caps how many of a role can
// appear; once hit, the role is blacklisted and stripped from all remaining
// tag option lists. If a tag has no remaining options it "fails" and falls back
// to FALLBACK_ROLE.
// ---------------------------------------------------------------------------

// [role, weight, max] — one allowable role under a given tag.
type RoleOption = readonly [RoleName, number, number];
// A tag paired with every role currently allowed under it.
type TagRoleOptions = [string, RoleOption[]];

// Sort so the most-constrained tags resolve first: empty option lists last,
// then fewest options first. Picking scarce tags early avoids wasting rare
// roles on tags that had no other choice.
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
	// Build the per-tag option lists from the configured roles.
	const roleOptions: TagRoleOptions[] = config.tags.map((tag) => {
		const possibleRoles: RoleOption[] = [];
		for (const [roleName, settings] of Object.entries(config.roles) as Array<
			[RoleName, GameConfig['roles'][RoleName] & {}]
		>) {
			if (!settings) continue;
			const roleTags = ROLE_TAGS_MAP[roleName] ?? [];
			// A tag matches a role if it's one of the role's pool tags OR the
			// role's canonical key (e.g. "citizen", "serial_killer").
			if ((roleTags as readonly string[]).includes(tag) || ROLE_KEY_BY_NAME[roleName] === tag) {
				possibleRoles.push([roleName, settings.weight, settings.max]);
			}
		}
		return [tag, possibleRoles];
	});

	roleOptions.sort(compareRoleOptionEntries);

	const selectedRoles: RoleName[] = [];
	const blacklist = new Set<RoleName>();

	while (roleOptions.length > 0) {
		// Blacklist any role that has reached its `max`, removing it from every
		// remaining tag's option list.
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

		// Resolve the most-constrained tag (front of the sorted list).
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

// ---------------------------------------------------------------------------
// Game
//
// In-memory model of a single game for the duration of one engine call. Holds
// the live actors, the event tree, and the graveyard. Construct via the static
// factories: `Game.new` (fresh game + role allocation) or `Game.load` (rebuild
// from a saved GameState). Mutating methods (`lynch`, `resolve`) advance the
// game; `state` / `dumpActors` project it back out for persistence.
// ---------------------------------------------------------------------------
class Game {
	public actors: Actor[] = [];
	// Root event tree for the whole game; action events get nested under it.
	public events = new GameEventGroup(EventGroupIds.ROOT);
	// Scratch group reused per-actor while resolving, then cloned into `events`.
	public actionEvents = new GameEventGroup(EventGroupIds.ACTION);
	private graveyard: GameState['graveyard'] = [];

	// Instantiate one Actor per input (role required), wiring shared logger /
	// event sink / rng into each, then precompute allies + legal targets.
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

	// Fresh game: generate a role pool from config, shuffle both actors and
	// roles, pad with FALLBACK_ROLE if short, then assign seat numbers + roles.
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

	// Rebuild a game from a persisted state: actors already carry their roles,
	// so just construct, restore the graveyard, and re-apply submitted targets.
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

	// Translate each actor's submitted target numbers into Actor references.
	private applyTargetsFromInputs() {
		for (const actor of this.actors) {
			const targets = (actor.input.targets ?? [])
				.map((targetNumber) => this.getActorByNumber(targetNumber))
				.filter((target): target is Actor => target !== undefined);
			actor.setTargets(targets);
		}
	}

	// Recompute, for every living actor, who its allies are and which targets
	// are currently legal. Must rerun whenever the living set changes.
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

	// Run one night cycle: advance the day, then resolve every actor's action
	// in role-priority order. Three phases: (1) prep, (2) validate targets,
	// (3) execute actions and collect their events.
	resolve() {
		this.context.logger.info('--- Resolving all actor actions ---');
		// Phase 1 — prep: advance day, refresh allies/targets, sort by role
		// priority so e.g. protective roles act before/after killers correctly.
		this.day += 1;
		this.generateAlliesAndPossibleTargets();
		this.actors = [...this.actors].sort(
			(a, b) =>
				(RoleNamesAndPriorityOrder.indexOf(a.roleName) ?? Number.POSITIVE_INFINITY) -
				(RoleNamesAndPriorityOrder.indexOf(b.roleName) ?? Number.POSITIVE_INFINITY),
		);

		// Phase 2 — validate: drop any actor's targets that aren't in its
		// currently-legal `possibleTargets` (stale/illegal submissions).
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

		// Phase 3 — execute: each living actor with targets performs its action.
		// Action events are collected into the scratch group, then (if any) cloned
		// as a nested group under the root event tree.
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

	// Persisted graveyard plus actors that died this cycle, projected into
	// persistable records (cause/day of death, role reveal, will, alignment).
	get fullGraveyard(): GameState['graveyard'] {
		const buriedActorNumbers = new Set(this.graveyard.map((death) => death.number));

		return [
			...this.graveyard,
			...this.deadActors
				.filter((actor) => !buriedActorNumbers.has(actor.requireNumber()))
				.map((actor) => ({
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

	// Minimal snapshot persisted between calls and reloaded by `Game.load`.
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

export { Game };
