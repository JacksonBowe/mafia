import { describe, expect, it } from 'vitest';
import { loadGame, newGame, resolveGame } from '../src/index';
import { DEFAULT_SEED, dummyConfig, dummyPlayers, toPlayerInput } from './fixtures';

describe('engine', () => {
	it('creates a new game with actors and state', () => {
		const players = dummyPlayers(3);
		const config = dummyConfig();

		const result = newGame({ players, config, options: { seed: DEFAULT_SEED } });

		expect(result.actors).toHaveLength(3);
		expect(result.state.day).toBe(1);
		expect(result.state.graveyard).toHaveLength(0);
		expect(result.events.events ?? result.events).toBeDefined();
	});

	it('loads a game from existing state', () => {
		const players = dummyPlayers(3);
		const config = dummyConfig();

		const created = newGame({ players, config, options: { seed: DEFAULT_SEED } });
		const loaded = loadGame({
			players: created.actors.map(toPlayerInput),
			config,
			state: created.state,
			options: { seed: DEFAULT_SEED },
		});

		expect(loaded.actors).toHaveLength(created.actors.length);
		expect(loaded.state.day).toBe(created.state.day);
	});

	it('resolves actions without a winner', () => {
		const players = [
			{
				id: 'user-2',
				name: 'UserName2',
				alias: 'UserAlias2',
				role: 'Mafioso',
				number: 1,
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
				role: 'Mafioso',
				number: 2,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: {},
			},
			{
				id: 'user-1',
				name: 'UserName1',
				alias: 'UserAlias1',
				role: 'Citizen',
				number: 3,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: { remainingVests: 2 },
			},
		];

		const config = {
			tags: ['town_government', 'mafia_killing', 'any_random', 'town_killing'],
			settings: {},
			roles: {
				Citizen: { max: 0, weight: 0.01, settings: { maxVests: 2 } },
				Mafioso: { max: 2, weight: 1, settings: { promotes: false } },
			},
		};

		const state = {
			day: 1,
			players: [
				{ number: 1, alias: 'UserAlias2', alive: true },
				{ number: 2, alias: 'UserAlias3', alive: true },
				{ number: 3, alias: 'UserAlias1', alive: true },
			],
			graveyard: [],
		};

		const resolved = resolveGame({
			players,
			config,
			state,
			options: { seed: DEFAULT_SEED },
		});

		expect(resolved.winners).toBeNull();
	});

	it('resolves actions with a town win', () => {
		const players = [
			{
				id: 'user-2',
				name: 'UserName2',
				alias: 'UserAlias2',
				role: 'Bodyguard',
				number: 1,
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
				role: 'Mafioso',
				number: 2,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: {},
			},
			{
				id: 'user-1',
				name: 'UserName1',
				alias: 'UserAlias1',
				role: 'Citizen',
				number: 3,
				alive: true,
				possibleTargets: [],
				targets: [],
				allies: [],
				roleActions: { remainingVests: 2 },
			},
		];

		const config = {
			tags: ['town_government', 'mafia_killing', 'any_random', 'town_killing'],
			settings: {},
			roles: {
				Citizen: { max: 0, weight: 0.01, settings: { maxVests: 2 } },
				Bodyguard: { max: 1, weight: 1, settings: {} },
				Mafioso: { max: 2, weight: 1, settings: { promotes: false } },
			},
		};

		const state = {
			day: 1,
			players: [
				{ number: 1, alias: 'UserAlias2', alive: true },
				{ number: 2, alias: 'UserAlias3', alive: true },
				{ number: 3, alias: 'UserAlias1', alive: true },
			],
			graveyard: [],
		};

		const resolved = resolveGame({
			players,
			config,
			state,
			options: { seed: DEFAULT_SEED },
		});

		expect(resolved.winners).toBeTruthy();
		expect(resolved.winners?.length).toBeGreaterThan(0);
		for (const winner of resolved.winners ?? []) {
			expect(winner.alignment).toBe('Town');
		}
	});
});
