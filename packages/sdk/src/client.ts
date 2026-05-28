import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { adminMethods, type AdminMethods } from './admin';
import { chatMethods, type ChatMethods } from './chat';
import { gameMethods, type GameMethods } from './game';
import { lobbyMethods, type LobbyMethods } from './lobby';
import { metaMethods, type MetaMethods } from './meta';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export type ClientOptions = {
	baseUrl: string;
	getAccessToken?: () => Promise<string | undefined> | string | undefined;
};

// ---------------------------------------------------------------------------
// Client type
// ---------------------------------------------------------------------------

export type ApiClient = {
	axios: AxiosInstance;
	request: <T>(config: AxiosRequestConfig) => Promise<T>;
} & LobbyMethods &
	ChatMethods &
	MetaMethods &
	GameMethods &
	AdminMethods;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createClient = ({
	baseUrl,
	getAccessToken
	// refreshSession,
	// onAuthFailure,
}: ClientOptions): ApiClient => {
	const instance = axios.create({ baseURL: baseUrl });

	instance.interceptors.request.use(async (config) => {
		const token = await getAccessToken?.();
		if (token) config.headers.Authorization = `Bearer ${token}`;
		return config;
	});

	const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
		const response = await instance.request<T>(config);
		return response.data;
	};

	return {
		axios: instance,
		request,
		...lobbyMethods(request),
		...chatMethods(request),
		...metaMethods(request),
		...gameMethods(request),
		...adminMethods(request),
	};
};
