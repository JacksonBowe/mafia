import type { Presence } from '@mafia/core/user/presence';
import type { UserInfo } from '@mafia/core/user/index';
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
