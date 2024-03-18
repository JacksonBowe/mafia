import { api } from 'src/boot/axios';
import { useQueryClient } from '@tanstack/vue-query';

/* ADMIN TERMINATE ALL LOBBIES */
export const terminateAllLobbies = async (): Promise<void> => {
	await api.post('/lobbies/terminate');

	const queryClient = useQueryClient();

	queryClient.invalidateQueries('lobbies');
};
