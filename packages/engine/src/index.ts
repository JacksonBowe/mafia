// ---------------------------------------------------------------------------
// Errors & constants
// ---------------------------------------------------------------------------
export {
	BROADCAST_TARGET, DeathReasons, DEFAULT_ALIGNMENT,
	DEFAULT_NIGHT_IMMUNE,
	DEFAULT_VESTS, EngineErrorCodes,
	EventGroupIds,
	EventIds,
	MAX_ACTORS,
	MIN_ACTORS
} from './constants';
export type { DeathReason, EngineErrorCode, EventId } from './constants';
export { EngineError } from './error';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export { DEFAULT_CONFIG } from './config';

// ---------------------------------------------------------------------------
// Top-level entry points
// ---------------------------------------------------------------------------
export { Game, loadGame, newGame, resolveGame } from './game';

// ---------------------------------------------------------------------------
// Events & logging
// ---------------------------------------------------------------------------
export { CommonEvents, Duration, GameEvent, GameEventGroup } from './events';
export type {
	GameEventDump,
	GameEventEntry,
	GameEventGroupDump,
	GameEventTargets
} from './events';
export { EngineLogger } from './logger';

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export {
	FALLBACK_ROLE, importRole,
	importRoleDefinition,
	instantiateRole,
	isRoleName,
	ROLE_CATALOG,
	ROLE_DESCRIPTIONS,
	ROLE_LIST,
	ROLE_NAMES,
	ROLE_PRIORITY,
	ROLE_REGISTRY, ROLE_TAGS, ROLE_TAGS_MAP
} from './roles';
export type {
	RoleCatalog,
	RoleConstructor,
	RoleDefinition,
	RoleName, RoleTag
} from './roles';

export { Actor, Mafia, Town } from './roles/actor';
export { Bodyguard, BodyguardSettingsSchema } from './roles/bodyguard';
export type { BodyguardSettings } from './roles/bodyguard';
export { Citizen, CitizenSettingsSchema } from './roles/citizen';
export type { CitizenSettings } from './roles/citizen';
export { Doctor, DoctorSettingsSchema } from './roles/doctor';
export type { DoctorSettings } from './roles/doctor';
export { Godfather, GodfatherSettingsSchema } from './roles/godfather';
export type { GodfatherSettings } from './roles/godfather';
export { Mafioso, MafiosoSettingsSchema } from './roles/mafioso';
export type { MafiosoSettings } from './roles/mafioso';
export { Survivor, SurvivorSettingsSchema } from './roles/survivor';
export type { SurvivorSettings } from './roles/survivor';

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------
export type { ActorContext, EngineContext } from './context';

// ---------------------------------------------------------------------------
// RNG utilities
// ---------------------------------------------------------------------------
export { createRng, toSnakeCase } from './utils';
export type { Rng } from './utils';

// ---------------------------------------------------------------------------
// Schemas & types
// ---------------------------------------------------------------------------
export {
	ActorAlignmentSchema,
	ActorStateInputSchema,
	ActorStateSchema,
	AllySchema,
	EngineInputSchema,
	EngineOptionsSchema,
	GameConfigSchema,
	GameStateSchema, RoleNameSchema,
	RoleSettingsSchema, RoleTagSchema, StateActorSchema,
	StateGraveyardRecordSchema,
	WinnerSummarySchema
} from './types';
export type {
	ActorAlignment,
	ActorState,
	ActorStateInput,
	Ally,
	EngineInput,
	EngineOptions,
	EngineResult,
	GameConfig,
	GameState,
	RoleSettings,
	StateActor,
	StateGraveyardRecord,
	WinnerSummary
} from './types';

