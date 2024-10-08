import { useMe } from 'src/lib/user';
import { MessageSchema } from 'src/lib/api/message';
import { v4 as uuidv4 } from 'uuid';
import { useChatStore } from 'src/stores/message';
import { ref } from 'vue';
import { api } from 'src/boot/axios';

export const useSendMessage = () => {
	const isLoading = ref(false);
	const error = ref<Error | null>(null);

	const cStore = useChatStore();
	const { data: user } = useMe(); // Fetch user data once

	const sendMessage = async (message: string) => {
		if (!message) return;

		isLoading.value = true;
		error.value = null;

		try {
			const sender = await user.value; // Use fetched user data

			if (!sender) throw new Error('User data not available');

			const msg = {
				// id: uuidv4(),
				// sender: {
				// 	id: sender.id,
				// 	name: sender.username,
				// },
				content: message,
				// target: cStore.channel,
				type: cStore.channel,
				// type: 'LOBBY',
			};

			console.log(msg);

			const response = await api.post('/chat/message', msg);

			console.log('response', response);
			// Validate the message using the schema
			// const parsedMessage = MessageSchema.parse(msg);

			// Add the validated message to the messages array
			// cStore.messages.push(parsedMessage);
			console.log(msg);
		} catch (err) {
			error.value = err as Error;
		} finally {
			isLoading.value = false;
		}
	};

	return { sendMessage, isLoading, error };
};
