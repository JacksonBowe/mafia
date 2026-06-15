import type { GameSyncResponse, LobbyInfo, UserInfo } from '@mafia/sdk';

export type RealtimeConfig = {
	endpoint: string;
	authorizer: string;
	prefix: string;
};

export type BotStatus =
	| 'idle'
	| 'authenticating'
	| 'connected'
	| 'joining_lobby'
	| 'in_lobby'
	| 'in_game'
	| 'disconnected'
	| 'error';

export type BotLogLevel = 'info' | 'error';

export type BotLogEntry = {
	at: Date;
	label: string;
	level: BotLogLevel;
	message: string;
	extra?: unknown;
};

export type BotSnapshot = {
	label: string;
	status: BotStatus;
	user: UserInfo | null;
	lobby: LobbyInfo | null;
	game: GameSyncResponse | null;
	lastError: string | null;
	logs: BotLogEntry[];
};

export type BotSessionConfig = {
	label: string;
	apiKey: string;
	lobbyId?: string;
	apiUrl: string;
	realtime: RealtimeConfig;
	onChange?: () => void;
	onLog?: (entry: BotLogEntry) => void;
};
