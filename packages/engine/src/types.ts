import { z } from 'zod';
import type { GameEventGroupDump } from './events';

export const RoleSettingsSchema = z.object({
	max: z.number().int().min(0),
	weight: z.number().min(0),
	settings: z.record(z.string(), z.any()).default({}),
});

export type RoleSettings = z.infer<typeof RoleSettingsSchema>;

export const GameConfigSchema = z.object({
	tags: z.array(z.string()),
	settings: z.record(z.string(), z.any()).default({}),
	roles: z.record(z.string(), RoleSettingsSchema),
});

export type GameConfig = z.infer<typeof GameConfigSchema>;

export const ActorStateSchema = z.object({
	id: z.string(),
	name: z.string(),
	alias: z.string(),
	role: z.string().optional(),
	number: z.number().int().min(1).max(15).optional(),
	alive: z.boolean().default(true),
	possibleTargets: z
		.array(z.array(z.number().int().min(1).max(15)).max(15))
		.max(2)
		.default([]),
	targets: z.array(z.number().int().min(1).max(15)).max(15).default([]),
	allies: z.array(z.object({}).passthrough()).default([]),
	roleActions: z.record(z.string(), z.any()).default({}),
});

export type ActorState = z.infer<typeof ActorStateSchema>;

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
});

export type StateGraveyardRecord = z.infer<typeof StateGraveyardRecordSchema>;

export const GameStateSchema = z.object({
	day: z.number().int().min(0).default(0),
	actors: z.array(StateActorSchema).default([]),
	graveyard: z.array(StateGraveyardRecordSchema).default([]),
});

export type GameState = z.infer<typeof GameStateSchema>;

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
	number: z.number().int().min(1).max(15),
	role: z.string(),
	alignment: z.enum(['Town', 'Mafia']),
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
