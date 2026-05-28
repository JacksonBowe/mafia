import type { AxiosRequestConfig } from 'axios';

export type RequestFn = <T>(config: AxiosRequestConfig) => Promise<T>;

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export const adminMethods = (request: RequestFn) => ({
	terminateLobbies: (): Promise<{ message: string }> =>
		request({ method: 'POST', url: '/admin/terminate-lobbies' }),

	terminateGames: (): Promise<{ message: string }> =>
		request({ method: 'POST', url: '/admin/terminate-games' }),
});

export type AdminMethods = ReturnType<typeof adminMethods>;
