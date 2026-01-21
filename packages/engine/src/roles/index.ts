import type { Actor, ActorContext } from './actor';
import type { PlayerInput } from '../types';
import { Bodyguard } from './bodyguard';
import { Citizen } from './citizen';
import { Doctor } from './doctor';
import { Godfather } from './godfather';
import { Mafioso } from './mafioso';

export const ROLE_LIST = [Citizen, Doctor, Bodyguard, Godfather, Mafioso] as const;

export const ROLE_TAGS_MAP = Object.fromEntries(
	ROLE_LIST.map((role) => [role.name, role.tags]),
) as Record<string, string[]>;

export type RoleConstructor = new (
	player: PlayerInput,
	settings: Record<string, unknown>,
	context: ActorContext,
) => Actor;

export const ROLE_REGISTRY: Record<string, RoleConstructor> = {
	Citizen,
	Doctor,
	Bodyguard,
	Godfather,
	Mafioso,
};

export const importRole = (roleName: string) => {
	const role = ROLE_REGISTRY[roleName];
	if (!role) {
		throw new Error(`Unknown role: ${roleName}`);
	}
	return role;
};
