import { defineStore } from 'pinia';
import { type Message } from 'src/lib/api/message';

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

	actions: {},
});
