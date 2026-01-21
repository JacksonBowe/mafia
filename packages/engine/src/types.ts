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

export type GameConfigInput = z.infer<typeof GameConfigSchema>;

export const PlayerSchema = z.object({
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

export type PlayerInput = z.infer<typeof PlayerSchema>;

export const StatePlayerSchema = z.object({
	number: z.number().int().min(1).max(15),
	alias: z.string(),
	alive: z.boolean(),
});

export type StatePlayer = z.infer<typeof StatePlayerSchema>;

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
	players: z.array(StatePlayerSchema).default([]),
	graveyard: z.array(StateGraveyardRecordSchema).default([]),
});

export type GameStateInput = z.infer<typeof GameStateSchema>;

export const EngineOptionsSchema = z
	.object({
		seed: z.number().int().optional(),
	})
	.default({});

export type EngineOptions = z.infer<typeof EngineOptionsSchema>;

export const EngineInputSchema = z.object({
	players: z.array(PlayerSchema),
	config: GameConfigSchema,
	state: GameStateSchema.optional(),
	options: EngineOptionsSchema.optional(),
});

export type EngineInput = z.infer<typeof EngineInputSchema>;

export type ActorState = {
	id: string;
	name: string;
	alias: string;
	role?: string;
	number?: number;
	alive?: boolean;
	possibleTargets: number[][];
	targets: number[];
	allies: Array<{ alias: string; number: number; role: string; alive: boolean }>;
	roleActions: Record<string, unknown>;
};

export type WinnerSummary = {
	id: string;
	name: string;
	alias: string;
	number: number;
	role: string;
	alignment: 'Town' | 'Mafia';
};

export type EngineResult = {
	state: GameStateInput;
	actors: ActorState[];
	events: GameEventGroupDump;
	winners: WinnerSummary[] | null;
	log: string[];
};
