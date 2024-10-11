import { api } from 'boot/axios';

import { type User } from './models';

export const fetchMe = async (): Promise<User> => {
	const r = await api.get('/users/me');
	return r.data;
};
