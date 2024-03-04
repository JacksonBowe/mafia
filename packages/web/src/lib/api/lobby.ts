import { z } from 'zod';
import { api } from 'src/boot/axios';

/* FETCH LOBBIES */
const LobbyHostSchema = z.object({
	id: z.string(),
	username: z.string(),
});
export type LobbyHost = z.infer<typeof LobbyHostSchema>;

const LobbyUserSchema = z.object({
	id: z.string(),
	type: z.string(),
	createdAt: z.number(),
	username: z.string(),
	lobbyId: z.string(),
});
export type LobbyUser = z.infer<typeof LobbyUserSchema>;

const LobbySchema = z.object({
	id: z.string(),
	type: z.string(),
	createdAt: z.number(),
	name: z.string(),
	host: LobbyHostSchema,
	config: z.string(),
	users: z.array(LobbyUserSchema).nullable(),
});
export type Lobby = z.infer<typeof LobbySchema>;

export const fetchLobbies = async (): Promise<Lobby[]> => {
	// TODO: Replace with API Call
	const lobbies: Lobby[] = [];

	for (let i = 0; i < 20; i++) {
		const users: LobbyUser[] = [];
		for (let j = 0; j < i + 1 && j < 15; j++) {
			users.push({
				id: `user${j + 1}`,
				createdAt: Date.now(),
				type: 'LOBBY_USER',
				username: `User ${j + 1}`,
				lobbyId: `lobby${i + 1}`,
			});
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
};

/* HOST LOBBY */

const HostLobbyPropsSchema = z.object({
	name: z.string(),
	config: z.string().optional(),
});
export type HostLobbyProps = z.infer<typeof HostLobbyPropsSchema>;

export const hostLobby = async (props: HostLobbyProps): Promise<Lobby> => {
	const payload = HostLobbyPropsSchema.parse(props);
	const r = await api.post('/lobbies', payload);
	return r.data;
};
