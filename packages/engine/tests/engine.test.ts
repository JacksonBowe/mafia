import { DEFAULT_SEED, dummyActors, dummyConfig, toActorInput } from '@mafia/engine/testing';
import { describe, expect, it } from 'vitest';
import { loadGame, newGame, resolveGame, type GameConfig } from '../src/index';

describe('engine', () => {
	it('creates a new game with actors and state', () => {
		const actors = dummyActors(3);
		const config = dummyConfig();

		const result = newGame({ actors, config, options: { seed: DEFAULT_SEED } });

		expect(result.actors).toHaveLength(3);
		expect(result.state.day).toBe(1);
		expect(result.state.graveyard).toHaveLength(0);
		expect(result.events.events ?? result.events).toBeDefined();
	});

	it('loads a game from existing state', () => {
		const actors = dummyActors(3);
		const config = dummyConfig();

		const created = newGame({ actors, config, options: { seed: DEFAULT_SEED } });
		const loaded = loadGame({
			actors: created.actors.map(toActorInput),
			config,
			state: created.state,
			options: { seed: DEFAULT_SEED },
		});

		expect(loaded.actors).toHaveLength(created.actors.length);
		expect(loaded.state.day).toBe(created.state.day);
	});

	it('resolves actions without a winner', () => {
		const actors = [
			{
				id: 'user-2',
				name: 'UserName2',
				alias: 'UserAlias2',
				role: 'Mafioso' as const,
				number: 1,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: {},
				alignment: null,
			},
			{
				id: 'user-3',
				name: 'UserName3',
				alias: 'UserAlias3',
				role: 'Mafioso' as const,
				number: 2,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: {},
				alignment: null,
			},
			{
				id: 'user-1',
				name: 'UserName1',
				alias: 'UserAlias1',
				role: 'Citizen' as const,
				number: 3,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: { remainingVests: 2 },
				alignment: null,
			},
		];

		const config: GameConfig = {
			tags: ['town_government', 'mafia_killing', 'any_random', 'town_killing'],
			settings: {},
			roles: {
				Citizen: { max: 0, weight: 0.01, settings: { maxVests: 2 } },
				Mafioso: { max: 2, weight: 1, settings: {} },
			},
		};

		const state = {
			day: 1,
			actors: [
				{ number: 1, alias: 'UserAlias2', alive: true },
				{ number: 2, alias: 'UserAlias3', alive: true },
				{ number: 3, alias: 'UserAlias1', alive: true },
			],
			graveyard: [],
		};

		const resolved = resolveGame({
			actors,
			config,
			state,
			options: { seed: DEFAULT_SEED },
		});

		expect(resolved.winners).toBeNull();
	});

	it('resolves actions with a town win', () => {
		const actors = [
			{
				id: 'user-2',
				name: 'UserName2',
				alias: 'UserAlias2',
				role: 'Bodyguard' as const,
				number: 1,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: {},
				alignment: null,
			},
			{
				id: 'user-3',
				name: 'UserName3',
				alias: 'UserAlias3',
				role: 'Mafioso' as const,
				number: 2,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: {},
				alignment: null,
			},
			{
				id: 'user-1',
				name: 'UserName1',
				alias: 'UserAlias1',
				role: 'Citizen' as const,
				number: 3,
				alive: true,
				possibleTargets: [],
				targets: [],
				allies: [],
				roleActions: { remainingVests: 2 },
				alignment: null,
			},
		];

		const config: GameConfig = {
			tags: ['town_government', 'mafia_killing', 'any_random', 'town_killing'],
			settings: {},
			roles: {
				Citizen: { max: 0, weight: 0.01, settings: { maxVests: 2 } },
				Bodyguard: { max: 1, weight: 1, settings: {} },
				Mafioso: { max: 2, weight: 1, settings: {} },
			},
		};

		const state = {
			day: 1,
			actors: [
				{ number: 1, alias: 'UserAlias2', alive: true },
				{ number: 2, alias: 'UserAlias3', alive: true },
				{ number: 3, alias: 'UserAlias1', alive: true },
			],
			graveyard: [],
		};

		const resolved = resolveGame({
			actors,
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

	it('co-awards survivors when another faction wins', () => {
		const actors = [
			{
				id: 'user-1',
				name: 'UserName1',
				alias: 'UserAlias1',
				role: 'Mafioso' as const,
				number: 1,
				alive: true,
				possibleTargets: [],
				targets: [2],
				allies: [],
				roleActions: {},
				alignment: null,
			},
			{
				id: 'user-2',
				name: 'UserName2',
				alias: 'UserAlias2',
				role: 'Citizen' as const,
				number: 2,
				alive: true,
				possibleTargets: [],
				targets: [],
				allies: [],
				roleActions: { remainingVests: 0 },
				alignment: null,
			},
			{
				id: 'user-3',
				name: 'UserName3',
				alias: 'UserAlias3',
				role: 'Survivor' as const,
				number: 3,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: { remainingVests: 1 },
				alignment: null,
			},
		];

		const config: GameConfig = {
			tags: ['mafia_killing', 'any_random', 'neutral_benign'],
			settings: {},
			roles: {
				Citizen: { max: 1, weight: 1, settings: { maxVests: 0 } },
				Mafioso: { max: 1, weight: 1, settings: {} },
				Survivor: { max: 1, weight: 1, settings: { maxVests: 1 } },
			},
		};

		const state = {
			day: 1,
			actors: [
				{ number: 1, alias: 'UserAlias1', alive: true },
				{ number: 2, alias: 'UserAlias2', alive: true },
				{ number: 3, alias: 'UserAlias3', alive: true },
			],
			graveyard: [],
		};

		const resolved = resolveGame({ actors, config, state, options: { seed: DEFAULT_SEED } });

		expect(resolved.winners).toBeTruthy();
		const alignments = (resolved.winners ?? []).map((w) => w.alignment);
		expect(alignments).toContain('Mafia');
		expect(resolved.winners?.some((w) => w.role === 'Survivor')).toBe(true);
	});

	it('survivors do not win when killed before the game ends', () => {
		const actors = [
			{
				id: 'user-1',
				name: 'UserName1',
				alias: 'UserAlias1',
				role: 'Mafioso' as const,
				number: 1,
				alive: true,
				possibleTargets: [],
				targets: [3],
				allies: [],
				roleActions: {},
				alignment: null,
			},
			{
				id: 'user-2',
				name: 'UserName2',
				alias: 'UserAlias2',
				role: 'Citizen' as const,
				number: 2,
				alive: false,
				possibleTargets: [],
				targets: [],
				allies: [],
				roleActions: { remainingVests: 0 },
				alignment: null,
			},
			{
				id: 'user-3',
				name: 'UserName3',
				alias: 'UserAlias3',
				role: 'Survivor' as const,
				number: 3,
				alive: true,
				possibleTargets: [],
				targets: [],
				allies: [],
				roleActions: { remainingVests: 0 },
				alignment: null,
			},
		];

		const config: GameConfig = {
			tags: ['mafia_killing', 'any_random', 'neutral_benign'],
			settings: {},
			roles: {
				Citizen: { max: 1, weight: 1, settings: { maxVests: 0 } },
				Mafioso: { max: 1, weight: 1, settings: {} },
				Survivor: { max: 1, weight: 1, settings: { maxVests: 0 } },
			},
		};

		const state = {
			day: 1,
			actors: [
				{ number: 1, alias: 'UserAlias1', alive: true },
				{ number: 2, alias: 'UserAlias2', alive: false },
				{ number: 3, alias: 'UserAlias3', alive: true },
			],
			graveyard: [],
		};

		const resolved = resolveGame({ actors, config, state, options: { seed: DEFAULT_SEED } });

		expect(resolved.winners).toBeTruthy();
		expect(resolved.winners?.some((w) => w.role === 'Survivor')).toBe(false);
		expect(resolved.winners?.some((w) => w.alignment === 'Mafia')).toBe(true);
	});

	it('awards last-alive winner regardless of role', () => {
		const actors = [
			{
				id: 'user-1',
				name: 'UserName1',
				alias: 'UserAlias1',
				role: 'Survivor' as const,
				number: 1,
				alive: true,
				possibleTargets: [],
				targets: [],
				allies: [],
				roleActions: { remainingVests: 0 },
				alignment: null,
			},
			{
				id: 'user-2',
				name: 'UserName2',
				alias: 'UserAlias2',
				role: 'Citizen' as const,
				number: 2,
				alive: false,
				possibleTargets: [],
				targets: [],
				allies: [],
				roleActions: { remainingVests: 0 },
				alignment: null,
			},
		];

		const config: GameConfig = {
			tags: ['neutral_benign', 'any_random'],
			settings: {},
			roles: {
				Citizen: { max: 1, weight: 1, settings: { maxVests: 0 } },
				Survivor: { max: 1, weight: 1, settings: { maxVests: 0 } },
			},
		};

		const state = {
			day: 1,
			actors: [
				{ number: 1, alias: 'UserAlias1', alive: true },
				{ number: 2, alias: 'UserAlias2', alive: false },
			],
			graveyard: [],
		};

		const resolved = resolveGame({ actors, config, state, options: { seed: DEFAULT_SEED } });

		console.log('Winners', resolved.winners);

		for (const winner of resolved.winners ?? []) {
			console.log('Winner', winner.name, winner.role, winner.alignment);
		}
		expect(resolved.winners).toHaveLength(1);
		expect(resolved.winners?.[0]?.role).toBe('Survivor');
	});
});
