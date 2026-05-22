import type { ZodType } from 'zod';
import { EngineErrorCodes } from '../constants';
import { EngineError } from '../error';
import type { ActorState } from '../types';
import type { Actor, ActorContext } from './actor';
import { Bodyguard } from './bodyguard';
import { Citizen } from './citizen';
import { Doctor } from './doctor';
import { Godfather } from './godfather';
import { Mafioso } from './mafioso';
import { Survivor } from './survivor';

export const ROLE_NAMES = [
	'Citizen',
	'Doctor',
	'Bodyguard',
	'Godfather',
	'Mafioso',
	'Survivor',
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const ROLE_TAGS = [
	'any_random',
	'survivor',
	'town_random',
	'town_government',
	'town_protective',
	'town_killing',
	'mafia_random',
	'mafia_killing',
	'neutral_random',
	'neutral_benign',
] as const;

export type RoleTag = (typeof ROLE_TAGS)[number];

export const FALLBACK_ROLE: RoleName = 'Citizen';

type RoleConstructor = new (
	input: ActorState,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	settings: any,
	context: ActorContext,
) => Actor;

type RoleDefinition = {
	Role: RoleConstructor;
	priority: number;
	tags: readonly string[];
	description: string;
	settingsSchema: ZodType;
};

export type RoleCatalog = Record<RoleName, RoleDefinition>;

export const ROLE_CATALOG: RoleCatalog = {
	Citizen: {
		Role: Citizen,
		priority: Citizen.priority,
		tags: Citizen.tags,
		description: Citizen.description,
		settingsSchema: Citizen.settingsSchema,
	},
	Doctor: {
		Role: Doctor,
		priority: Doctor.priority,
		tags: Doctor.tags,
		description: Doctor.description,
		settingsSchema: Doctor.settingsSchema,
	},
	Bodyguard: {
		Role: Bodyguard,
		priority: Bodyguard.priority,
		tags: Bodyguard.tags,
		description: Bodyguard.description,
		settingsSchema: Bodyguard.settingsSchema,
	},
	Godfather: {
		Role: Godfather,
		priority: Godfather.priority,
		tags: Godfather.tags,
		description: Godfather.description,
		settingsSchema: Godfather.settingsSchema,
	},
	Mafioso: {
		Role: Mafioso,
		priority: Mafioso.priority,
		tags: Mafioso.tags,
		description: Mafioso.description,
		settingsSchema: Mafioso.settingsSchema,
	},
	Survivor: {
		Role: Survivor,
		priority: Survivor.priority,
		tags: Survivor.tags,
		description: Survivor.description,
		settingsSchema: Survivor.settingsSchema,
	},
};

export const ROLE_LIST = ROLE_NAMES.map((roleName) => ROLE_CATALOG[roleName].Role);

const buildRoleRecord = <V>(pick: (definition: RoleDefinition) => V) => {
	const record = {} as Record<RoleName, V>;
	for (const roleName of ROLE_NAMES) {
		record[roleName] = pick(ROLE_CATALOG[roleName]);
	}
	return record;
};

export const ROLE_REGISTRY = buildRoleRecord((definition) => definition.Role);

export const ROLE_PRIORITY = buildRoleRecord((definition) => definition.priority);

export const ROLE_TAGS_MAP = buildRoleRecord((definition) => definition.tags);

export const ROLE_DESCRIPTIONS = buildRoleRecord((definition) => definition.description);

export const isRoleName = (value: string): value is RoleName =>
	(ROLE_NAMES as readonly string[]).includes(value);

export const importRoleDefinition = (roleName: string): RoleDefinition => {
	if (!isRoleName(roleName)) {
		throw new EngineError(EngineErrorCodes.UNKNOWN_ROLE, `Unknown role: ${roleName}`, {
			roleName,
		});
	}
	return ROLE_CATALOG[roleName];
};

export const importRole = (roleName: string): RoleConstructor =>
	importRoleDefinition(roleName).Role;

export const instantiateRole = (
	roleName: string,
	input: ActorState,
	settings: unknown,
	context: ActorContext,
): Actor => {
	const definition = importRoleDefinition(roleName);
	const parsed = definition.settingsSchema.parse(settings);
	return new definition.Role(input, parsed, context);
};

export type { RoleConstructor, RoleDefinition };
