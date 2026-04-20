// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
export { createClient } from './client';
export type { ApiClient, ClientOptions } from './client';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export { ApiError } from './errors';

// ---------------------------------------------------------------------------
// Schema types (re-exported from @mafia/functions contracts)
// ---------------------------------------------------------------------------
export type {
	CreateLobbyJson,
	LobbyIdPathParams,
} from '@mafia/functions/api/schemas/lobby.schemas';

export type { SendChatMessageJson } from '@mafia/functions/api/schemas/chat.schemas';

// ---------------------------------------------------------------------------
// SDK input types
// ---------------------------------------------------------------------------
export type { CreateLobbyInput, LobbyIdInput } from './lobby';
export type { SendChatMessageInput } from './chat';

// ---------------------------------------------------------------------------
// Domain method types
// ---------------------------------------------------------------------------
export type { LobbyMethods } from './lobby';
export type { ChatMethods } from './chat';
export type { MetaMethods } from './meta';
export type { GameMethods } from './game';
export type { AdminMethods } from './admin';

// ---------------------------------------------------------------------------
// Re-exported domain types from @mafia/core (for frontend consumers)
// ---------------------------------------------------------------------------
export * from './types';
