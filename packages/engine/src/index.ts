export { EngineError } from './error';
export { DEFAULT_CONFIG } from './config';
export { newGame, loadGame, resolveGame } from './game';
export { CommonEvents, Duration, GameEvent, GameEventGroup } from './events';
export { EngineLogger } from './logger';
export {
	ROLE_LIST,
	ROLE_REGISTRY,
	ROLE_TAGS_MAP,
	ROLE_PRIORITY,
	GAME_TAGS,
	FALLBACK_ROLE,
	importRole,
	isRoleName,
} from './roles';
export type { RoleName, GameTag, RoleConstructor } from './roles';
export {
	ActorStateSchema,
	ActorStateInputSchema,
	EngineInputSchema,
	EngineOptionsSchema,
	GameConfigSchema,
	GameStateSchema,
	RoleNameSchema,
	GameTagSchema,
} from './types';
export type {
	ActorState,
	ActorStateInput,
	EngineInput,
	EngineOptions,
	EngineResult,
	GameConfig,
	GameState,
	RoleSettings,
	StateActor,
	StateGraveyardRecord,
	WinnerSummary,
} from './types';
