import type { GameInfo, GameSync } from '@mafia/core/game/index';
import { api } from 'src/boot/axios';

export const fetchGame = async (gameId: string): Promise<GameInfo> => {
	const response = await api.get<GameInfo>(`/game/${gameId}`);
	return response.data;
};

export const fetchActiveGame = async (): Promise<GameInfo | null> => {
	const response = await api.get<{ game: GameInfo | null }>('/game/me/active');
	return response.data.game;
};

export const fetchGameSync = async (): Promise<GameSync | null> => {
	const response = await api.get<{ sync: GameSync | null }>('/game/me/sync');
	return response.data.sync;
};
