import { z } from 'zod';
import { MAX_ACTORS } from '../constants';


// Registry (this is where we will determine priority order for role selection, so order matters here)
export const RoleRegistry = [
	'Citizen',
	'Bodyguard',
	'Doctor',
	'Godfather',
	'Mafioso',
	'Survivor',
]
export type RoleName = (typeof RoleRegistry)[number];

export const RoleNameSchema = z.enum(RoleRegistry);

// Alignment
export const RoleAlignment = ['Town', 'Mafia', 'Neutral'] as const;
export type RoleAlignment = (typeof RoleAlignment)[number];

export const RoleAlignmentSchema = z.enum(RoleAlignment);

// Tags
export const RoleTags = {
	AnyRandom: 'any_random',

	// Town
	TownRandom: 'town_random',
	TownGovernment: 'town_government',
	TownProtective: 'town_protective',
	TownKilling: 'town_killing',
	TownPower: 'town_power',
	TownInvestigative: 'town_investigative',
	TownSupport: 'town_support',

	// Mafia
	MafiaRandom: 'mafia_random',
	MafiaKilling: 'mafia_killing',
	MafiaSupport: 'mafia_support',
	MafiaDeception: 'mafia_deception',


	// Neutrals
	NeutralRandom: 'neutral_random',
	NeutralKilling: 'neutral_killing',
	NeutralEvil: 'neutral_evil',
	NeutralBenign: 'neutral_benign',
} as const;

export type RoleTag = (typeof RoleTags)[keyof typeof RoleTags];

export type RoleKey = Lowercase<string>;

// export type RoleTag = RolePoolTag | RoleIdentityTag;

export const ROLE_TAGS = Object.values(RoleTags) as RoleTag[];

export const RoleTagSchema = z.enum(ROLE_TAGS);

// Allies
export const RoleAllySchema = z.object({
	number: z.number().int().min(1).max(MAX_ACTORS),
	alias: z.string(),
	role: RoleNameSchema,
	alive: z.boolean(),
});

export type RoleAlly = z.infer<typeof RoleAllySchema>;