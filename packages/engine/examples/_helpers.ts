import {
	DEFAULT_CONFIG,
	type ActorState,
	type GameConfig,
} from '../src/index';

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
	}));

/**
 * Returns DEFAULT_CONFIG sliced to the given actor count.
 * For backwards compatibility with existing tests.
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
