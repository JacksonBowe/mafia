import { api } from 'src/boot/axios';

export interface SendMessageRequest {
	content: string;
	type: string;
}

export const sendMessage = async (
	message: SendMessageRequest
): Promise<void> => {
	return await api.post('/chat/message', message);
};
