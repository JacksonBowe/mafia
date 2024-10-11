<template>
	<div :class="messageClass">
		<!-- User messages (GLOBAL, LOBBY, PRIVATE) -->
		<span v-if="messageHasSender(message)">
			<!-- Special case for GLOBAL messages: red sender, white content -->
			<span v-if="message.type === 'GLOBAL'">
				<span :class="senderClass">{{ message.sender!.username }}</span
				>:
				<span class="text-white">{{ message.content }}</span>
			</span>

			<!-- LOBBY and PRIVATE messages (sender colored, content white) -->
			<span v-else>
				<span :class="senderClass">{{ message.sender!.username }}</span
				>:
				<span class="text-white">{{ message.content }}</span>
			</span>
		</span>

		<!-- System messages (entire content colored) -->
		<span v-else-if="message.type === 'SYSTEM'">
			SYSTEM: {{ message.content }}
		</span>

		<!-- Info messages (entire content colored) -->
		<span v-else-if="message.type === 'INFO'">
			{{ message.content }}
		</span>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { type Message } from 'src/lib/chat';

// Define props
const props = defineProps<{
	message: Message;
}>();

// Type guard to check if the message has a sender
function messageHasSender(
	message: Message,
): message is Message & { sender: { id: string; username: string } } {
	return (
		message.type === 'GLOBAL' ||
		message.type === 'LOBBY' ||
		message.type === 'PRIVATE'
	);
}

// Computed property to dynamically apply classes based on message type (for the message content)
const messageClass = computed(() => {
	switch (props.message.type) {
		case 'GLOBAL':
			return '';
		case 'LOBBY':
			return '';
		case 'PRIVATE':
			return '';
		case 'SYSTEM':
			return 'text-system';
		case 'INFO':
			return 'text-info';
		default:
			return '';
	}
});

// Computed property to dynamically apply classes based on sender type (for the sender's name)
const senderClass = computed(() => {
	switch (props.message.type) {
		case 'GLOBAL':
			return 'text-mafia'; // Red sender for global messages
		case 'LOBBY':
			return 'text-lobby'; // Orange sender for lobby messages
		case 'PRIVATE':
			return 'text-private'; // Purple-ish sender for private messages
		default:
			return '';
	}
});
</script>
