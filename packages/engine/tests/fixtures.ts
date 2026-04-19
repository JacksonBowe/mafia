import type { ActorState, GameConfig } from '../src/index';

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

export const dummyConfig = (): GameConfig => ({
	tags: ['town_random', 'town_protective', 'mafia_killing'],
	settings: {},
	roles: {
		Citizen: { max: 3, weight: 1, settings: { maxVests: 2 } },
		Bodyguard: { max: 1, weight: 1, settings: {} },
		Mafioso: { max: 1, weight: 1, settings: {} },
	},
});

export const toActorInput = (actor: ActorState): ActorState => ({
	...actor,
	alive: actor.alive ?? true,
	possibleTargets: actor.possibleTargets ?? [],
	targets: actor.targets ?? [],
	allies: actor.allies ?? [],
	roleActions: actor.roleActions ?? {},
});
