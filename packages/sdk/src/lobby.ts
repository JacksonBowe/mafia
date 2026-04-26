import type { LobbyInfo } from '@mafia/core/lobby/schema';
import type { AxiosRequestConfig } from 'axios';
import type { CreateLobbyJson, LobbyIdPathParams } from '@mafia/functions/api/schemas/lobby.schemas';

export type RequestFn = <T>(config: AxiosRequestConfig) => Promise<T>;

// ---------------------------------------------------------------------------
// Input types (re-exported from schemas for SDK consumers)
// ---------------------------------------------------------------------------

export type CreateLobbyInput = CreateLobbyJson;
export type LobbyIdInput = LobbyIdPathParams;

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export const lobbyMethods = (request: RequestFn) => ({
	createLobby: (input: CreateLobbyInput): Promise<LobbyInfo> =>
		request({ method: 'POST', url: '/lobby', data: input }),

	listLobbies: (): Promise<LobbyInfo[]> =>
		request({ method: 'GET', url: '/lobby' }),

	getLobby: (input: LobbyIdInput): Promise<LobbyInfo> =>
		request({ method: 'GET', url: `/lobby/${input.lobbyId}` }),

	joinLobby: (input: LobbyIdInput): Promise<{ success: boolean }> =>
		request({ method: 'POST', url: `/lobby/${input.lobbyId}/join` }),

	leaveLobby: (): Promise<{ success: boolean }> =>
		request({ method: 'POST', url: '/lobby/leave' }),

	startLobby: (input: LobbyIdInput): Promise<{ success: boolean; gameId: string }> =>
		request({ method: 'POST', url: `/lobby/${input.lobbyId}/start` }),
});

export type LobbyMethods = ReturnType<typeof lobbyMethods>;
