// ---------------------------------------------------------------------------
// Re-exports from @mafia/core for frontend consumers.
// The web app should import everything from @mafia/sdk instead of @mafia/core.
//
// IMPORTANT: only import from pure schema files (no SST/AWS/Drizzle/Hono/Neon/ws).
// Allowed paths: @mafia/core/{message,error/schema,db/schema,lobby/schema,
// user/schema,game/schema} and @mafia/engine.
// ---------------------------------------------------------------------------

// --- DB schemas & types ---
export { EntityBaseSchema, RelatedEntitySchema } from '@mafia/core/db/schema';
export type { EntityBase, Page, RelatedEntity } from '@mafia/core/db/schema';

// --- Error schemas & types ---
export { isULID, PublicErrorSchema, zBoolQuery } from '@mafia/core/error/schema';
export type { PublicErrorPayload, ULID } from '@mafia/core/error/schema';

// --- Game schemas & types ---
export {
	ClientGameInfoSchema,
	DeathRecordSchema, GameErrors, GameEventSchema,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics, VerdictSchema,
	WinnerSummarySchema
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
	WinnerSummary
} from '@mafia/core/game/schema';

// --- Engine types & values (canonical role/tag/alignment surface) ---
export {
	ActorAlignmentSchema,
	ActorStateInputSchema,
	ActorStateSchema,
	FALLBACK_ROLE, GameConfigSchema,
	GameStateSchema, isRoleName,
	ROLE_LIST,
	ROLE_NAMES,
	ROLE_PRIORITY,
	ROLE_REGISTRY, ROLE_TAGS, ROLE_TAGS_MAP,
	RoleNameSchema, RoleTagSchema
} from '@mafia/engine';
export type {
	ActorAlignment,
	ActorStateInput, RoleName,
	RoleSettings, RoleTag, StateActor,
	StateGraveyardRecord
} from '@mafia/engine';

// --- Lobby schemas & types ---
export {
	LobbyErrors, LobbyInfoSchema, LobbyMemberErrors, LobbyMemberInfoSchema, MAX_PLAYERS, MIN_PLAYERS
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
	MessageSenderSchema
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
	MessageSender
} from '@mafia/core/message';

// --- User schemas & types ---
export { PresenceSchema, UserErrors, UserInfoSchema } from '@mafia/core/user/schema';
export type { Presence, UserInfo } from '@mafia/core/user/schema';

