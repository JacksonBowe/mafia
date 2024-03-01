export interface LobbyHost {
	id: string;
	username: string;
}

export interface LobbyUser {
	id: string;
	type: string;
	createdAt: number;
	username: string;
	lobbyId: string;
}

export interface Lobby {
	id: string;
	type: string;
	createdAt: number;
	name: string;
	host: LobbyHost
	config: string
	users: LobbyUser[] | null
}
