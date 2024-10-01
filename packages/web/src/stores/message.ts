import { defineStore } from 'pinia';
import { useMe } from 'src/lib/composables';

import { MessageSchema } from 'src/lib/api/message';

interface ChatState {
	channel: 'GLOBAL' | 'LOBBY' | 'PRIVATE';
	messages: Array<{
		sender: {
			id: string;
			name: string;
		};
		content: string;
		target: string;
		type: string;
	}>;
}

export const useChatStore = defineStore('chat', {
	state: (): ChatState => ({
		channel: 'GLOBAL',
		messages: [],
	}),

	getters: {},

	actions: {
		sendMessage(message: string) {
			if (!message) return;
			const { data: sender } = useMe();

			if (!sender.value) return;

			const msg = {
				sender: {
					id: sender.value.id,
					name: sender.value.username,
				},
				content: message,
				target: this.channel,
				type: this.channel,
			};

			// Validate the message using the schema
			const parsedMessage = MessageSchema.parse(msg);

			// Add the validated message to the messages array
			this.messages.push(parsedMessage);
		},
	},
});
