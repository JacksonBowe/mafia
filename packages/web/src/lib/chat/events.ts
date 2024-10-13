import { useChatStore } from 'src/stores/chat';
import { type Message, MessageSchema } from './models';
import type { EventBus } from 'quasar';

export type ChatEvents = {
	'chat.message': (properties: Message) => void;
};

export function registerChatEvents(bus: EventBus<ChatEvents>) {
	console.log('LOADING CHAT EVENTS');

	bus.on('chat.message', (properties: Message) => {
		console.log('Received message', properties);
		const message = MessageSchema.parse(properties);

		const cStore = useChatStore();
		cStore.messages.push(message);
	});
}
