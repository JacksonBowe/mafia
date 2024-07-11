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
	config: z.string().transform((v: string) => JSON.parse(v)),
	users: z.array(LobbyUserSchema).nullable(),
});
export type Lobby = z.infer<typeof LobbySchema>;

export const fetchLobbies = async (): Promise<Lobby[]> => {
	const response = await api.get('/lobbies', { params: { users: true } });
	return LobbySchema.array().parse(response.data);
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

/* JOIN LOBBY */
const JoinLobbyPropsSchema = z.object({
	lobbyId: z.string(),
});
export type JoinLobbyProps = z.infer<typeof JoinLobbyPropsSchema>;

export const joinLobby = async (props: JoinLobbyProps): Promise<Lobby> => {
	const payload = JoinLobbyPropsSchema.parse(props);
	const r = await api.post(`/lobbies/${payload.lobbyId}/join`);
	return r.data;
};

/* LEAVE LOBBY */
export const leaveLobby = async (): Promise<void> => {
	await api.post('/lobbies/leave');
};
