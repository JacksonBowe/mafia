import type { GameSyncResponse } from '@mafia/core/game/index';

const aliases = [
	'Shadow',
	'Viper',
	'Ghost',
	'Raven',
	'Blaze',
	'Frost',
	'Storm',
	'Hawk',
	'Cobra',
	'Wolf',
	'Dagger',
	'Phantom',
	'Ember',
	'Thorn',
	'Wraith',
];

const makeState = (): GameSyncResponse['state'] => ({
	day: 2,
	actors: aliases.map((alias, i) => ({
		number: i + 1,
		alias,
		alive: i < 13,
	})),
	graveyard: [
		{ number: 14, alias: 'Thorn', cod: 'Killed by Mafia', dod: 1, role: 'Doctor', will: '' },
		{
			number: 15,
			alias: 'Wraith',
			cod: 'Killed by Serial Killer',
			dod: 1,
			role: 'Lookout',
			will: 'N1: watched #3',
		},
	],
});

const makeConfig = (): GameSyncResponse['config'] => ({
	tags: ['classic'],
	settings: {},
	roles: {
		Mafioso: { max: 1, weight: 1, settings: {} },
		Godfather: { max: 1, weight: 1, settings: {} },
		Doctor: { max: 1, weight: 1, settings: {} },
		Lookout: { max: 1, weight: 1, settings: {} },
		Townie: { max: 11, weight: 1, settings: {} },
	},
});

const makeActor = (): GameSyncResponse['actor'] => ({
	id: 'dummy-actor-id',
	name: 'DevPlayer',
	alias: 'Shadow',
	role: 'Mafioso',
	number: 1,
	alive: true,
	possibleTargets: [[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]],
	targets: [],
	allies: [{ alias: 'Viper', number: 2, role: 'Godfather', alive: true }],
	roleActions: {},
});

export const dummyGameSync: GameSyncResponse = {
	info: {
		id: 'dummy-game-id',
		status: 'active',
		phase: 'day',
		pollCount: 0,
		syncTs: 0, // overwritten at load time
	},
	state: makeState(),
	config: makeConfig(),
	actor: makeActor(),
};
