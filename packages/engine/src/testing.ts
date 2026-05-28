import { DEFAULT_CONFIG } from './config';
import type { ActorState, GameConfig } from './types';

/**
 * Shared test/example fixtures. Importable as `@mafia/engine/testing`.
 *
 * Not part of the runtime API surface — used by the package's own tests and
 * runnable examples to avoid duplicating boilerplate actor and config payloads.
 */

export const DEFAULT_SEED = 42;

export const dummyActors = (count: number): ActorState[] =>
	Array.from({ length: count }, (_, index) => ({
		id: `user-${index + 1}`,
		name: `UserName${index + 1}`,
		alias: `UserAlias${index + 1}`,
		alive: true,
		possibleTargets: [],
		targets: [],
		allies: [],
		roleActions: {},
		alignment: null,
	}));

/**
 * Returns {@link DEFAULT_CONFIG} sliced to the given actor count so the tag
 * list matches the number of seats at the table.
 */
export const dummyConfig = (actorCount = 3): GameConfig => ({
	...DEFAULT_CONFIG,
	tags: DEFAULT_CONFIG.tags.slice(0, actorCount),
});

export const toActorInput = (actor: ActorState): ActorState => ({
	...actor,
	alive: actor.alive ?? true,
	possibleTargets: actor.possibleTargets ?? [],
	targets: actor.targets ?? [],
	allies: actor.allies ?? [],
	roleActions: actor.roleActions ?? {},
});
