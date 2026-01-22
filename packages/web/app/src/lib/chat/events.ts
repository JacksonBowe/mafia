import { MessageSchema } from '@mafia/core/message';
import type { AppBus } from 'src/boot/bus';
import { useMessageStore } from 'src/stores/message';
import { inject, onMounted, onUnmounted } from 'vue';
import { z } from 'zod';

export const ChatEventSchemas = {
	'realtime.chat.message': z.object({
		message: MessageSchema,
	}),
} as const;

export function useChatEvents() {
	const bus = inject<AppBus>('bus');
	if (!bus) throw new Error('Bus not provided');

	const mStore = useMessageStore();
	const off: Array<() => void> = [];

	onMounted(() => {
		off.push(
			bus.on('realtime.chat.message', ({ message }) => {
				mStore.addMessage(message);
			}),
		);
	});

	onUnmounted(() => off.forEach((fn) => fn()));
}
