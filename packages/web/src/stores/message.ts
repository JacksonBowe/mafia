import { defineStore } from 'pinia';
import { useMe } from 'src/lib/user';

import { MessageSchema } from 'src/lib/api/message';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library

interface ChatState {
	channel: 'GLOBAL' | 'LOBBY' | 'PRIVATE';
	messages: Array<{
		id: string;
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
				id: uuidv4(),
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
