import type { GamePhase, GameSyncResponse, Verdict } from '@mafia/sdk';
import type { useGameStore } from 'src/stores/game';

export const gameSandboxVariants = [
	'pregame',
	'morning',
	'day',
	'poll',
	'defense',
	'trial',
	'lynch',
	'evening',
	'night',
	'dead',
	'on-trial',
	'voted',
	'verdict-guilty',
	'verdict-abstain',
	'verdict-innocent',
] as const;

export type GameSandboxVariant = (typeof gameSandboxVariants)[number];

type GameSandbox = {
	sync: GameSyncResponse;
	onTrialActorNumber: number | null;
	verdicts: Record<number, Verdict>;
};

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
		alive: i < 9,
	})),
	graveyard: [
		{
			number: 14,
			alias: 'Thorn',
			cod: 'They were found riddled with bullets',
			dod: 1,
			role: 'Doctor',
			will: '',
			alignment: 'Town',
		},
		{
			number: 14,
			alias: 'Wraith',
			cod: 'Killed by Serial Killer',
			dod: 1,
			role: 'Bodyguard',
			will: 'N1: watched #3',
			alignment: 'Town',
		},
		{
			number: 13,
			alias: 'Ember',
			cod: 'Lynched',
			dod: 2,
			role: 'Bodyguard',
			will: 'N1: watched #3',
			alignment: 'Town',
		},
		{
			number: 12,
			alias: 'Phantom',
			cod: 'Died in a shootout',
			dod: 5,
			role: 'Godfather',
			will: 'N1: watched #3',
			alignment: 'Town',
		},
		{
			number: 11,
			alias: 'Dagger',
			cod: 'Died in a shootout',
			dod: 5,
			role: 'Bodyguard',
			will: 'N1: watched #3',
			alignment: 'Town',
		},
		{
			number: 10,
			alias: 'Wolf',
			cod: 'They were found riddled with bullets. The corpse also shows signs of stabbing post-mortem',
			dod: 8,
			role: 'Survivor',
			will: 'N1: watched #3',
			alignment: 'Town',
		},
	],
});

const makeConfig = (): GameSyncResponse['config'] => ({
	tags: ['town_random', 'mafia_random'],
	settings: {},
	roles: {
		Mafioso: { max: 1, weight: 1, settings: {} },
		Godfather: { max: 1, weight: 1, settings: {} },
		Doctor: { max: 1, weight: 1, settings: {} },
		Bodyguard: { max: 1, weight: 1, settings: {} },
		Citizen: { max: 11, weight: 1, settings: {} },
	},
});

const makeActor = (): GameSyncResponse['actor'] => ({
	id: 'sandbox-actor-id',
	name: 'DevPlayer',
	alias: 'Shadow',
	role: 'Mafioso',
	number: 1,
	alive: true,
	possibleTargets: [[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]],
	targets: [],
	allies: [{ alias: 'Viper', number: 2, role: 'Godfather', alive: true }],
	roleActions: {},
	alignment: 'Mafia',
});

const phaseForVariant = (variant: GameSandboxVariant): GamePhase => {
	if (variant === 'dead') return 'day';
	if (variant === 'on-trial') return 'trial';
	if (variant === 'voted') return 'poll';
	if (variant === 'verdict-guilty' || variant === 'verdict-abstain' || variant === 'verdict-innocent')
		return 'trial';
	return variant satisfies GamePhase;
};

export const isGameSandboxVariant = (value: string): value is GameSandboxVariant => {
	return gameSandboxVariants.includes(value as GameSandboxVariant);
};

export const makeGameSandbox = (variant: GameSandboxVariant = 'day'): GameSandbox => {
	const phase = phaseForVariant(variant);
	const actor = makeActor();
	const actorNumber = actor.number ?? 1;
	let onTrialActorNumber: number | null = ['defense', 'trial', 'lynch'].includes(phase) ? 3 : null;
	const verdicts: Record<number, Verdict> = {};

	if (variant === 'dead') {
		actor.alive = false;
	}

	if (variant === 'on-trial') {
		onTrialActorNumber = actorNumber;
	}

	if (variant === 'verdict-guilty') {
		verdicts[actorNumber] = 'guilty';
		verdicts[2] = 'abstain';
		verdicts[4] = 'guilty';
	}

	if (variant === 'verdict-abstain') {
		verdicts[actorNumber] = 'abstain';
		verdicts[2] = 'innocent';
		verdicts[4] = 'guilty';
	}

	if (variant === 'verdict-innocent') {
		verdicts[actorNumber] = 'innocent';
		verdicts[2] = 'innocent';
		verdicts[4] = 'guilty';
	}

	return {
		sync: {
			info: {
				id: 'sandbox-game-id',
				status: 'active',
				phase,
				pollCount: phase === 'poll' ? 1 : 0,
				syncTs: Date.now(),
			},
			state: makeState(),
			config: makeConfig(),
			actor,
			votes: variant === 'voted' ? { [actorNumber]: 3, 2: 3, 4: 5 } : {},
		},
		onTrialActorNumber,
		verdicts,
	};
};

export const loadGameSandbox = (
	gameStore: ReturnType<typeof useGameStore>,
	variant: GameSandboxVariant = 'day',
) => {
	const sandbox = makeGameSandbox(variant);
	gameStore.hydrateSandboxGame(sandbox.sync, sandbox.onTrialActorNumber, sandbox.verdicts);
};
