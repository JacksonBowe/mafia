<template>
	<div class="menu-message" :class="messageClass">
		<span v-if="showName" class="menu-message__name q-mr-xs">{{ displayName }}:</span>
		<span class="menu-message__text">{{ message.text }}</span>
	</div>
</template>

<script setup lang="ts">
import type { Message } from 'src/lib/message';
import { computed } from 'vue';

const props = defineProps<{ message: Message }>();

const channelClassMap: Record<string, string> = {
	GLOBAL: 'text-global',
	LOBBY: 'text-lobby',
	PRIVATE: 'text-private',
};

const showName = computed(
	() => props.message.kind === 'USER' && props.message.sender.type === 'USER',
);

const displayName = computed(() => {
	if (props.message.sender.type !== 'USER') return '';
	return props.message.sender.displayName ?? 'Player';
});

const messageClass = computed(() => {
	if (props.message.kind === 'SYSTEM') return 'text-system';
	if (props.message.kind === 'INFO') return 'text-info';
	if (props.message.scope === 'menu') {
		return channelClassMap[props.message.channel] ?? '';
	}
	return '';
});
</script>

<style scoped>
.menu-message {
	line-height: 1.35;
}

.menu-message__name {
	font-size: 1em;
	font-weight: 400;
	opacity: 0.8;
}

.menu-message__text {
	font-size: 1em;
	font-weight: 400;
}
</style>
