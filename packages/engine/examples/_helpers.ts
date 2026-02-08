import {
	DEFAULT_CONFIG,
	type ActorState,
	type GameConfigInput,
	type PlayerInput,
} from '../src/index';

export const DEFAULT_SEED = 42;

export const dummyPlayers = (count: number): PlayerInput[] =>
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
 * Returns DEFAULT_CONFIG sliced to the given player count.
 * For backwards compatibility with existing tests.
 */
export const dummyConfig = (playerCount = 3): GameConfigInput => ({
	...DEFAULT_CONFIG,
	tags: DEFAULT_CONFIG.tags.slice(0, playerCount),
});

export const toPlayerInput = (player: ActorState): PlayerInput => ({
	...player,
	alive: player.alive ?? true,
	possibleTargets: player.possibleTargets ?? [],
	targets: player.targets ?? [],
	allies: player.allies ?? [],
	roleActions: player.roleActions ?? {},
});
