import type { ActorContext } from './actor';
import type { ActorState } from '../types';
import { Bodyguard } from './bodyguard';
import { Citizen } from './citizen';
import { Doctor } from './doctor';
import { Godfather } from './godfather';
import { Mafioso } from './mafioso';

export const ROLE_LIST = [Citizen, Doctor, Bodyguard, Godfather, Mafioso] as const;

/** Union of all known role names. */
export type RoleName = 'Citizen' | 'Doctor' | 'Bodyguard' | 'Godfather' | 'Mafioso';

export const ROLE_NAMES = ['Citizen', 'Doctor', 'Bodyguard', 'Godfather', 'Mafioso'] as const satisfies readonly RoleName[];

/**
 * All valid game tags. Includes role-specific tags plus category tags
 * that may not map directly to a role name.
 */
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

/** Priority order for action resolution. Lower index = resolves first. */
export const ROLE_PRIORITY: Record<RoleName, number> = Object.fromEntries(
	ROLE_LIST.map((role, index) => [role.name, index]),
) as Record<RoleName, number>;

export const ROLE_TAGS_MAP: Record<RoleName, readonly string[]> = {
	Citizen: Citizen.tags,
	Doctor: Doctor.tags,
	Bodyguard: Bodyguard.tags,
	Godfather: Godfather.tags,
	Mafioso: Mafioso.tags,
};

export type RoleConstructor = new (
	input: ActorState,
	settings: Record<string, unknown>,
	context: ActorContext,
) => InstanceType<(typeof ROLE_LIST)[number]>;

export const ROLE_REGISTRY: Record<RoleName, RoleConstructor> = {
	Citizen,
	Doctor,
	Bodyguard,
	Godfather,
	Mafioso,
};

/** The default fallback role when a tag cannot be filled. */
export const FALLBACK_ROLE: RoleName = 'Citizen';

export const importRole = (roleName: string): RoleConstructor => {
	const role = ROLE_REGISTRY[roleName as RoleName];
	if (!role) {
		throw new Error(`Unknown role: ${roleName}`);
	}
	return role;
};

export const isRoleName = (value: string): value is RoleName => value in ROLE_REGISTRY;
