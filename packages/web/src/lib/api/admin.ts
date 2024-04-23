import { api } from 'src/boot/axios';

/* ADMIN TERMINATE ALL LOBBIES */
export const terminateAllLobbies = async (): Promise<void> => {
	await api.post('/lobbies/terminate');
};
