// ---------------------------------------------------------------------------
// Re-exports from @mafia/core for frontend consumers.
// The web app should import everything from @mafia/sdk instead of @mafia/core.
// ---------------------------------------------------------------------------

// --- DB types ---
export type { RelatedEntity } from '@mafia/core/db/types';

// --- Error types ---
export type { PublicError } from '@mafia/core/error';

// --- Game types ---
export type {
	ActorState,
	ClientGameInfo,
	GameConfig,
	GameState,
	GameSyncResponse,
} from '@mafia/core/game/index';

// --- Lobby types ---
export type { LobbyInfo } from '@mafia/core/lobby/index';

// --- Message types & schemas ---
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

// --- User types ---
export type { UserInfo } from '@mafia/core/user/index';
export type { Presence } from '@mafia/core/user/presence';
