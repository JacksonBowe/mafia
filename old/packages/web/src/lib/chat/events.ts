import { useChatStore } from 'src/stores/chat';
import { type Message, MessageSchema } from './models';
import type { EventBus } from 'quasar';
import { inject, onMounted, onUnmounted } from 'vue';

export type ChatEvents = {
	'chat.message': (properties: Message) => void;
};

export function useChatEvents() {
	// Inject the globally provided EventBus
	const bus = inject<EventBus<ChatEvents>>('bus');

	if (!bus) {
		throw new Error('EventBus not provided');
	}

	// Register event listeners when the component is mounted
	onMounted(() => {
		console.log('LOADING CHAT EVENTS');

		// Event listener for 'chat.message'
		bus.on('chat.message', (properties: Message) => {
			console.log('Received message', properties);
			const message = MessageSchema.parse(properties);

			const cStore = useChatStore();
			cStore.messages.push(message);
		});
	});

	// Clean up event listeners when the component is unmounted
	onUnmounted(() => {
		bus.off('chat.message');
	});
}
