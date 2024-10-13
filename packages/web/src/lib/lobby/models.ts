import { z } from 'zod';

export const LobbyUserSchema = z.object({
	id: z.string(),
	type: z.string(),
	createdAt: z.number(),
	username: z.string(),
	lobbyId: z.string(),
});
export type LobbyUser = z.infer<typeof LobbyUserSchema>;
