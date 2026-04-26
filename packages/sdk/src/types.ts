// ---------------------------------------------------------------------------
// Re-exports from @mafia/core for frontend consumers.
// The web app should import everything from @mafia/sdk instead of @mafia/core.
//
// IMPORTANT: only import from pure schema files (no SST/AWS/Drizzle/Hono/Neon/ws).
// Allowed paths: @mafia/core/{message,error/schema,db/schema,lobby/schema,
// user/schema,game/schema} and @mafia/engine.
// ---------------------------------------------------------------------------

// --- DB schemas & types ---
export { RelatedEntitySchema, EntityBaseSchema } from '@mafia/core/db/schema';
export type { RelatedEntity, EntityBase, Page } from '@mafia/core/db/schema';

// --- Error schemas & types ---
export { PublicErrorSchema, isULID, zBoolQuery } from '@mafia/core/error/schema';
export type { PublicErrorPayload, ULID } from '@mafia/core/error/schema';

// --- Game schemas & types ---
export {
	ClientGameInfoSchema,
	DeathRecordSchema,
	GameEventSchema,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics,
	GameErrors,
	VerdictSchema,
	WinnerSummarySchema,
} from '@mafia/core/game/schema';
export type {
	ActorState,
	ClientGameInfo,
	DeathRecord,
	GameConfig,
	GameEvent,
	GameInfo,
	GamePhase,
	GamePlayer,
	GameState,
	GameStatus,
	GameSyncResponse,
	Verdict,
	WinnerSummary,
} from '@mafia/core/game/schema';

// --- Engine types & values (canonical role/tag/alignment surface) ---
export {
	ActorAlignmentSchema,
	ActorStateInputSchema,
	ActorStateSchema,
	FALLBACK_ROLE,
	GAME_TAGS,
	GameConfigSchema,
	GameStateSchema,
	GameTagSchema,
	isRoleName,
	ROLE_LIST,
	ROLE_NAMES,
	ROLE_PRIORITY,
	ROLE_REGISTRY,
	ROLE_TAGS_MAP,
	RoleNameSchema,
} from '@mafia/engine';
export type {
	ActorAlignment,
	ActorStateInput,
	GameTag,
	RoleName,
	RoleSettings,
	StateActor,
	StateGraveyardRecord,
} from '@mafia/engine';

// --- Lobby schemas & types ---
export {
	LobbyInfoSchema,
	LobbyMemberInfoSchema,
	LobbyErrors,
	LobbyMemberErrors,
	MIN_PLAYERS,
	MAX_PLAYERS,
} from '@mafia/core/lobby/schema';
export type { LobbyInfo, LobbyMemberInfo } from '@mafia/core/lobby/schema';

// --- Message schemas & types ---
export {
	AppChannelSchema,
	GameChannelSchema,
	MenuChannelSchema,
	MessageKindSchema,
	MessageListSchema,
	MessageSchema,
	MessageScopeSchema,
	MessageSenderSchema,
} from '@mafia/core/message';
export type {
	AppChannel,
	GameChannel,
	MenuChannel,
	Message,
	MessageChannel,
	MessageKind,
	MessageList,
	MessageScope,
	MessageSender,
} from '@mafia/core/message';

// --- User schemas & types ---
export { UserInfoSchema, PresenceSchema, UserErrors } from '@mafia/core/user/schema';
export type { UserInfo, Presence } from '@mafia/core/user/schema';
