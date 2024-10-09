import { useMe } from 'src/lib/user';
import { useChatStore } from 'src/stores/chat';
import { ref } from 'vue';
import { sendMessage } from './api';

export type ChatEvents = {
	// ['chat:message']: (message: Message) => void;
};

export const useSendMessage = () => {
	const isLoading = ref(false);
	const error = ref<Error | null>(null);

	const cStore = useChatStore();
	const { data: user } = useMe(); // Fetch user data once

	const send = async (message: string) => {
		if (!message) return;

		isLoading.value = true;
		error.value = null;

		try {
			const sender = await user.value; // Use fetched user data

			if (!sender) throw new Error('User data not available');

			await sendMessage({
				content: message,
				type: cStore.channel,
			});
		} catch (err) {
			error.value = err as Error;
		} finally {
			isLoading.value = false;
		}
	};

	return { send, isLoading, error };
};