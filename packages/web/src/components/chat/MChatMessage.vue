<template>
	<div :class="messageClass">
		<!-- User messages (GLOBAL, LOBBY, PRIVATE) -->
		<span v-if="messageHasSender(message)">
			<!-- Special case for GLOBAL messages: red sender, white content -->
			<span v-if="message.type === 'GLOBAL'">
				<span class="text-mafia">{{ message.sender!.name }}</span
				>:
				<span>{{ message.content }}</span>
			</span>

			<!-- Other user messages (LOBBY, PRIVATE) -->
			<span v-else>
				{{ message.sender!.name }}: {{ message.content }}
			</span>
		</span>

		<!-- System messages -->
		<span v-else-if="message.type === 'SYSTEM'">
			SYSTEM: {{ message.content }}
		</span>

		<!-- Info messages -->
		<span v-else-if="message.type === 'INFO'">
			{{ message.content }}
		</span>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { type Message } from 'src/lib/api/message';

// Define props
const props = defineProps<{
	message: Message;
}>();

// Type guard to check if the message has a sender
function messageHasSender(
	message: Message
): message is Message & { sender: { id: string; name: string } } {
	return (
		message.type === 'GLOBAL' ||
		message.type === 'LOBBY' ||
		message.type === 'PRIVATE'
	);
}

// Computed property to dynamically apply classes based on message type
const messageClass = computed(() => {
	switch (props.message.type) {
		case 'GLOBAL':
			return 'text-global';
		case 'LOBBY':
			return 'text-lobby';
		case 'PRIVATE':
			return 'text-private';
		case 'SYSTEM':
			return 'text-system';
		case 'INFO':
			return 'text-info';
		default:
			return '';
	}
});
</script>
