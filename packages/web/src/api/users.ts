import { z } from 'zod';
import { api } from 'boot/axios';

const UserSchema = z.object({
	id: z.string(),
	type: z.string(),
	username: z.string(),
	provider: z.string(),
	avatar: z.string().optional(),
	lobby: z.string().optional(),
	game: z.string().optional(),
	roles: z.array(z.string()).optional(),
	lastLogin: z.number().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const fetchMe = async (): Promise<User> => {
	const r = await api.get('/users/me');
	return r.data;
};
