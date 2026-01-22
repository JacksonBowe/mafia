import { api } from 'src/boot/axios';

export const sendMenuGlobalMessage = async (text: string): Promise<void> => {
	await api.post('/chat/message', { text });
};
