import type { GameConfigInput } from './types';

/**
 * Default game configuration for a 15-player game.
 * Setup: 8 Town, 3 Mafia, 3 Neutral, 1 Any (8-3-3-1)
 *
 * Tags are ordered slots that get filled with roles.
 * If a tag can't be filled, the engine falls back to Citizen.
 *
 * For games with fewer players, slice the tags array:
 *   { ...DEFAULT_CONFIG, tags: DEFAULT_CONFIG.tags.slice(0, playerCount) }
 */
export const DEFAULT_CONFIG: GameConfigInput = {
	tags: [
		// 8 Town slots
		'town_protective', // Guaranteed protective (Doctor/Bodyguard)
		'town_killing', // Town killing role (Bodyguard)
		'town_random',
		'town_random',
		'town_random',
		'town_random',
		'town_random',
		'town_random',

		// 3 Mafia slots
		'mafia_killing', // Guaranteed killing mafia (Godfather/Mafioso)
		'mafia_random',
		'mafia_random',

		// 3 Neutral slots (will fall back to Citizen until neutral roles exist)
		'neutral_random',
		'neutral_random',
		'neutral_random',

		// 1 Any slot
		'any_random',
	],

	settings: {},

	roles: {
		// Town roles
		Citizen: {
			max: 15,
			weight: 1,
			settings: { maxVests: 2 },
		},
		Doctor: {
			max: 2,
			weight: 2,
			settings: {},
		},
		Bodyguard: {
			max: 2,
			weight: 1,
			settings: {},
		},

		// Mafia roles
		Godfather: {
			max: 1,
			weight: 2,
			settings: { nightImmune: 2 },
		},
		Mafioso: {
			max: 3,
			weight: 1,
			settings: {},
		},
	},
};
