import type { GameSyncResponse } from '@mafia/core/game/index';
import { api } from 'src/boot/axios';

export const fetchGame = async (): Promise<GameSyncResponse | null> => {
	const response = await api.get<GameSyncResponse | null>('/game');
	return response.data;
};
