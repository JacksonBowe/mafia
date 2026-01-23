import type { LobbyInfo } from '@mafia/core/lobby/index';
import type { CreateLobbyJson } from '@mafia/functions/src/api/lobby';
import { api } from 'src/boot/axios';

export const hostLobby = async (lobby: CreateLobbyJson): Promise<LobbyInfo> => {
	const res = await api.post<LobbyInfo>('/lobby', lobby);

	console.log('hostLobby', res.data);
	return res.data;
};

export const listLobbies = async (): Promise<LobbyInfo[]> => {
	const res = await api.get<LobbyInfo[]>('/lobby');
	return res.data;
};

export const fetchLobby = async (lobbyId: string): Promise<LobbyInfo> => {
	const res = await api.get<LobbyInfo>(`/lobby/${lobbyId}`);
	return res.data;
};

export const joinLobby = async (lobbyId: string): Promise<void> => {
	await api.post(`/lobby/${lobbyId}/join`);
};

export const leaveLobby = async (): Promise<void> => {
	await api.post(`/lobby/leave`);
};

export const startLobby = async (
	lobbyId: string,
): Promise<{ success: boolean; gameId: string }> => {
	const res = await api.post<{ success: boolean; gameId: string }>(`/lobby/${lobbyId}/start`);
	return res.data;
};
