import { defineStore } from 'pinia';
import { uid } from 'quasar';
import { type Message } from 'src/lib/chat';

interface ChatState {
	channel: 'GLOBAL' | 'LOBBY' | 'PRIVATE';
	messages: Array<Message>;
}

export const useChatStore = defineStore('chat', {
	state: (): ChatState => ({
		channel: 'GLOBAL',
		messages: [],
	}),

	getters: {},

	actions: {
		newInfoMessage(message: string) {
			console.log('newInfoMessage');
			this.messages.push({
				id: uid(),
				content: message,
				type: 'INFO',
				timestamp: Date.now(),
				target: 'self',
			});
		},
	},
});
