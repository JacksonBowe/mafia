import type { MenuChannel } from 'src/lib/message';
import { api } from 'src/boot/axios';

export const sendMenuMessage = async (text: string, channel: MenuChannel): Promise<void> => {
	await api.post('/chat/message', { text, channel });
};
