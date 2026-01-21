import type { ActorState, GameConfigInput, PlayerInput } from '../src/index';

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

export const dummyConfig = (): GameConfigInput => ({
	tags: ['town_random', 'town_protective', 'mafia_killing'],
	settings: {},
	roles: {
		Citizen: { max: 3, weight: 1, settings: { maxVests: 2 } },
		Bodyguard: { max: 1, weight: 1, settings: {} },
		Mafioso: { max: 1, weight: 1, settings: { promotes: false } },
	},
});

export const toPlayerInput = (player: ActorState): PlayerInput => ({
	...player,
	alive: player.alive ?? true,
	possibleTargets: player.possibleTargets ?? [],
	targets: player.targets ?? [],
	allies: player.allies ?? [],
	roleActions: player.roleActions ?? {},
});
