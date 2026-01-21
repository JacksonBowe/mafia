import { resolveGame, type GameConfigInput, type PlayerInput } from '../src/index';
import { DEFAULT_SEED } from './_helpers';

const players: PlayerInput[] = [
	{
		id: 'user-1',
		name: 'UserName1',
		alias: 'UserAlias1',
		role: 'Bodyguard',
		number: 1,
		alive: true,
		possibleTargets: [],
		targets: [3],
		allies: [],
		roleActions: {},
	},
	{
		id: 'user-2',
		name: 'UserName2',
		alias: 'UserAlias2',
		role: 'Mafioso',
		number: 2,
		alive: true,
		possibleTargets: [],
		targets: [3],
		allies: [],
		roleActions: {},
	},
	{
		id: 'user-3',
		name: 'UserName3',
		alias: 'UserAlias3',
		role: 'Citizen',
		number: 3,
		alive: true,
		possibleTargets: [],
		targets: [],
		allies: [],
		roleActions: { remainingVests: 2 },
	},
];

const config: GameConfigInput = {
	tags: ['town_random', 'town_protective', 'mafia_killing'],
	settings: {},
	roles: {
		Citizen: { max: 1, weight: 1, settings: { maxVests: 2 } },
		Bodyguard: { max: 1, weight: 1, settings: {} },
		Mafioso: { max: 1, weight: 1, settings: { promotes: false } },
	},
};

const state = {
	day: 1,
	players: [
		{ number: 1, alias: 'UserAlias1', alive: true },
		{ number: 2, alias: 'UserAlias2', alive: true },
		{ number: 3, alias: 'UserAlias3', alive: true },
	],
	graveyard: [],
};

const run = () => {
	const resolved = resolveGame({
		players,
		config,
		state,
		options: { seed: DEFAULT_SEED },
	});

	console.log('Resolved game state (town win):');
	console.log(JSON.stringify(resolved.state, null, 2));

	console.log('\nResolved events:');
	console.log(JSON.stringify(resolved.events, null, 2));

	console.log('\nWinners:');
	console.log(JSON.stringify(resolved.winners, null, 2));

	console.log('\nLog:');
	console.log(resolved.log.join('\n'));
};

run();
