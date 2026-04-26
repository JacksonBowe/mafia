/**
 * Single source of truth for role and tag identifiers.
 *
 * Kept dependency-free (no class imports, no zod) so both `types.ts` (Zod
 * schemas) and `roles/index.ts` (registry) can consume without cycles.
 */

export const ROLE_NAMES = [
	'Citizen',
	'Doctor',
	'Bodyguard',
	'Godfather',
	'Mafioso',
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const GAME_TAGS = [
	'any_random',
	'town_random',
	'town_government',
	'town_protective',
	'town_killing',
	'mafia_random',
	'mafia_killing',
	'neutral_random',
] as const;

export type GameTag = (typeof GAME_TAGS)[number];

/** The default fallback role when a tag cannot be filled. */
export const FALLBACK_ROLE: RoleName = 'Citizen';
