export interface LobbyHost {
	id: string;
	username: string;
}

export interface Lobby {
	id: string;
	type: string;
	createdAt: number;
	host: LobbyHost
	config: string
}
