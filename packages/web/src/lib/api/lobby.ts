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

export const fetchLobbies = async (): Promise<Lobby[]> => {
	// TODO: Replace with API Call
	const lobbies: Lobby[] = [];

	for (let i = 0; i < 20; i++) {
		const users: LobbyUser[] = []
		for (let j = 0; j < i+1 && j < 15; j++) {
			users.push({
				id: `user${j + 1}`,
				createdAt: Date.now(),
				type: 'LOBBY_USER',
				username: `User ${j + 1}`,
				lobbyId: `lobby${i + 1}`
			})
		}
		lobbies.push({
			id: `lobby${i + 1}`,
			type: 'LOBBY',
			createdAt: Date.now(),
			name: `Lobby ${i + 1}`,
			host: { id: `host${i + 1}`, username: `Host ${i + 1}` },
			config: `config${i + 1}`,
			users: users,
		});
	}

	return lobbies;
}
