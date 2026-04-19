import { z } from 'zod';
import type { GameEventGroupDump } from './events';

// ---------------------------------------------------------------------------
// Role & Tag schemas
// ---------------------------------------------------------------------------

/**
 * Known role names. Validated at the schema boundary so downstream code
 * can trust the value is a member of the union.
 */
export const RoleNameSchema = z.enum([
	'Citizen',
	'Doctor',
	'Bodyguard',
	'Godfather',
	'Mafioso',
]);

export const GameTagSchema = z.enum([
	'any_random',
	'town_random',
	'town_government',
	'town_protective',
	'town_killing',
	'mafia_random',
	'mafia_killing',
	'neutral_random',
]);

// ---------------------------------------------------------------------------
// Role settings
// ---------------------------------------------------------------------------

export const RoleSettingsSchema = z.object({
	max: z.number().int().min(0),
	weight: z.number().min(0),
	settings: z.record(z.string(), z.unknown()).default({}),
});

export type RoleSettings = z.infer<typeof RoleSettingsSchema>;

// ---------------------------------------------------------------------------
// Game config
// ---------------------------------------------------------------------------

export const GameConfigSchema = z.object({
	tags: z.array(GameTagSchema),
	settings: z.record(z.string(), z.unknown()).default({}),
	roles: z
		.record(z.string(), RoleSettingsSchema)
		.refine(
			(roles): roles is Partial<Record<z.infer<typeof RoleNameSchema>, z.infer<typeof RoleSettingsSchema>>> => {
				return Object.keys(roles).every((key) => RoleNameSchema.safeParse(key).success);
			},
			{ message: 'All role keys must be valid role names' },
		),
});

export type GameConfig = z.infer<typeof GameConfigSchema>;

// ---------------------------------------------------------------------------
// Actor alignment
// ---------------------------------------------------------------------------

export const ActorAlignmentSchema = z.enum(['Town', 'Mafia', 'Neutral']);

export type ActorAlignment = z.infer<typeof ActorAlignmentSchema>;

// ---------------------------------------------------------------------------
// Actor state — input variant (what callers provide, alignment optional)
// ---------------------------------------------------------------------------

export const ActorStateInputSchema = z.object({
	id: z.string(),
	name: z.string(),
	alias: z.string(),
	role: RoleNameSchema.optional(),
	number: z.number().int().min(1).max(15).optional(),
	alive: z.boolean().default(true),
	possibleTargets: z
		.array(z.array(z.number().int().min(1).max(15)).max(15))
		.max(2)
		.default([]),
	targets: z.array(z.number().int().min(1).max(15)).max(15).default([]),
	allies: z.array(z.object({}).passthrough()).default([]),
	roleActions: z.record(z.string(), z.unknown()).default({}),
	alignment: ActorAlignmentSchema.nullable().default(null),
});

export type ActorStateInput = z.infer<typeof ActorStateInputSchema>;

// ---------------------------------------------------------------------------
// Actor state — normalised (after Zod parse, alignment always present)
// ---------------------------------------------------------------------------

export const ActorStateSchema = ActorStateInputSchema;

export type ActorState = z.output<typeof ActorStateSchema>;

// ---------------------------------------------------------------------------
// State sub-types
// ---------------------------------------------------------------------------

export const StateActorSchema = z.object({
	number: z.number().int().min(1).max(15),
	alias: z.string(),
	alive: z.boolean(),
});

export type StateActor = z.infer<typeof StateActorSchema>;

export const StateGraveyardRecordSchema = z.object({
	number: z.number().int().min(1).max(15),
	alias: z.string(),
	cod: z.string(),
	dod: z.number().int().min(0),
	role: z.string(),
	will: z.string(),
	alignment: ActorAlignmentSchema,
});

export type StateGraveyardRecord = z.infer<typeof StateGraveyardRecordSchema>;

export const GameStateSchema = z.object({
	day: z.number().int().min(0).default(0),
	actors: z.array(StateActorSchema).default([]),
	graveyard: z.array(StateGraveyardRecordSchema).default([]),
});

export type GameState = z.infer<typeof GameStateSchema>;

// ---------------------------------------------------------------------------
// Engine I/O
// ---------------------------------------------------------------------------

export const EngineOptionsSchema = z
	.object({
		seed: z.number().int().optional(),
	})
	.default({});

export type EngineOptions = z.infer<typeof EngineOptionsSchema>;

export const EngineInputSchema = z.object({
	actors: z.array(ActorStateInputSchema),
	config: GameConfigSchema,
	state: GameStateSchema.optional(),
	options: EngineOptionsSchema.optional(),
});

export type EngineInput = z.infer<typeof EngineInputSchema>;

export const WinnerSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	alias: z.string(),
	number: z.number().int().min(1).max(15),
	role: z.string(),
	alignment: ActorAlignmentSchema,
});

export type WinnerSummary = z.infer<typeof WinnerSummarySchema>;

export const EngineOutputSchema = z.object({
	state: GameStateSchema,
	actors: z.array(ActorStateSchema),
	events: z.array(z.object({}).passthrough()),
	winners: z.array(WinnerSummarySchema).nullable(),
	log: z.array(z.string()).default([]),
});

export type EngineOutput = z.infer<typeof EngineOutputSchema>;

export type EngineResult = {
	state: GameState;
	actors: ActorState[];
	events: GameEventGroupDump;
	winners: WinnerSummary[] | null;
	log: string[];
};
