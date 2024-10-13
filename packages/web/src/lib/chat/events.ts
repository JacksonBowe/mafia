import { useChatStore } from 'src/stores/chat';
import { type Message, MessageSchema } from './models';
import { bus } from 'src/boot/bus';

export type ChatEvents = {
	'chat.message': (properties: Message) => void;
};

console.log('LOADED CHAT EVENTS');

bus.on('chat.message', (properties: Message) => {
	console.log('Received message', properties);
	const message = MessageSchema.parse(properties);

	const cStore = useChatStore();
	cStore.messages.push(message);
});
