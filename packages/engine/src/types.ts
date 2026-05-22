import { z } from 'zod';
import { MAX_ACTORS } from './constants';
import type { GameEventGroupDump } from './events';
import { GAME_TAGS, ROLE_NAMES } from './roles/catalog';

// ---------------------------------------------------------------------------
// Role & Tag schemas
// ---------------------------------------------------------------------------

/**
 * Known role names. Validated at the schema boundary so downstream code
 * can trust the value is a member of the union.
 */
export const RoleNameSchema = z.enum(ROLE_NAMES);

export const GameTagSchema = z.enum(GAME_TAGS);

export type { RoleName, GameTag } from './roles/catalog';

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
	/**
	 * Role keys are constrained to {@link RoleNameSchema} so the inferred type
	 * is `Partial<Record<RoleName, RoleSettings>>` without resorting to a refine
	 * predicate cast. Unknown role keys are rejected at parse time; missing
	 * known role keys are permitted (use {@link z.partialRecord} so callers
	 * supply only the roles they configure).
	 */
	roles: z.partialRecord(RoleNameSchema, RoleSettingsSchema),
});

export type GameConfig = z.infer<typeof GameConfigSchema>;

// ---------------------------------------------------------------------------
// Actor alignment
// ---------------------------------------------------------------------------

export const ActorAlignmentSchema = z.enum(['Town', 'Mafia', 'Neutral']);

export type ActorAlignment = z.infer<typeof ActorAlignmentSchema>;

// ---------------------------------------------------------------------------
// Ally summary
// ---------------------------------------------------------------------------

/**
 * Lightweight ally projection produced by {@link Actor.dumpState}.
 * Strict (no passthrough) so consumers know exactly what to expect.
 */
export const AllySchema = z.object({
	number: z.number().int().min(1).max(MAX_ACTORS),
	alias: z.string(),
	role: RoleNameSchema,
	alive: z.boolean(),
});

export type Ally = z.infer<typeof AllySchema>;

// ---------------------------------------------------------------------------
// Actor state
//
// `ActorStateInput` and `ActorState` are aliases of the same schema. The
// distinction is preserved as a public naming convention (input vs resolved)
// even though Zod's input/output types coincide here.
// ---------------------------------------------------------------------------

export const ActorStateSchema = z.object({
	id: z.string(),
	name: z.string(),
	alias: z.string(),
	role: RoleNameSchema.optional(),
	number: z.number().int().min(1).max(MAX_ACTORS).optional(),
	alive: z.boolean().default(true),
	possibleTargets: z
		.array(z.array(z.number().int().min(1).max(MAX_ACTORS)).max(MAX_ACTORS))
		.max(2)
		.default([]),
	targets: z.array(z.number().int().min(1).max(MAX_ACTORS)).max(MAX_ACTORS).default([]),
	allies: z.array(AllySchema).default([]),
	roleActions: z.record(z.string(), z.unknown()).default({}),
	alignment: ActorAlignmentSchema.nullable().default(null),
	will: z.string().optional(),
});

export type ActorState = z.infer<typeof ActorStateSchema>;

/** @deprecated alias for {@link ActorStateSchema}; kept for SDK consumers. */
export const ActorStateInputSchema = ActorStateSchema;
/** @deprecated alias for {@link ActorState}; kept for SDK consumers. */
export type ActorStateInput = ActorState;

// ---------------------------------------------------------------------------
// State sub-types
// ---------------------------------------------------------------------------

export const StateActorSchema = z.object({
	number: z.number().int().min(1).max(MAX_ACTORS),
	alias: z.string(),
	alive: z.boolean(),
});

export type StateActor = z.infer<typeof StateActorSchema>;

export const StateGraveyardRecordSchema = z.object({
	number: z.number().int().min(1).max(MAX_ACTORS),
	alias: z.string(),
	cod: z.string(),
	dod: z.number().int().min(0),
	role: RoleNameSchema,
	will: z.string().default(''),
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
	actors: z.array(ActorStateSchema),
	config: GameConfigSchema,
	state: GameStateSchema.optional(),
	options: EngineOptionsSchema.optional(),
});

export type EngineInput = z.infer<typeof EngineInputSchema>;

export const WinnerSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	alias: z.string(),
	number: z.number().int().min(1).max(MAX_ACTORS),
	role: RoleNameSchema,
	alignment: ActorAlignmentSchema,
});

export type WinnerSummary = z.infer<typeof WinnerSummarySchema>;

export type EngineResult = {
	state: GameState;
	actors: ActorState[];
	events: GameEventGroupDump;
	winners: WinnerSummary[] | null;
	log: string[];
};
