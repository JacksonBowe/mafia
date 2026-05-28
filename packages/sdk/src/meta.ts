import type { Presence, UserInfo } from '@mafia/core/user/schema';
import type { AxiosRequestConfig } from 'axios';

export type RequestFn = <T>(config: AxiosRequestConfig) => Promise<T>;

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export const metaMethods = (request: RequestFn) => ({
	getMe: (): Promise<UserInfo> =>
		request({ method: 'GET', url: '/me' }),

	getPresence: (): Promise<Presence> =>
		request({ method: 'GET', url: '/presence' }),
});

export type MetaMethods = ReturnType<typeof metaMethods>;
