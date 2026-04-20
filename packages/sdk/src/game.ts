import type { GameSyncResponse } from '@mafia/core/game/index';
import type { AxiosRequestConfig } from 'axios';

export type RequestFn = <T>(config: AxiosRequestConfig) => Promise<T>;

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export const gameMethods = (request: RequestFn) => ({
	/** Fetch the current user's active game sync data (or null if none). */
	getGame: (): Promise<GameSyncResponse | null> =>
		request({ method: 'GET', url: '/game' }),
});

export type GameMethods = ReturnType<typeof gameMethods>;
