<template>
	<q-scroll-area ref="scrollAreaRef" @scroll="handleScroll">
		<div class="menu-messages">
			<div v-for="message in mStore.sortedMessages" :key="message.id" class="menu-messages__item">
				<MenuMessagesItem :message="message" />
			</div>
		</div>
	</q-scroll-area>
</template>

<script setup lang="ts">
import type { QScrollArea } from 'quasar';
import { nextTick, ref, watch } from 'vue';
import { useMessageStore } from 'src/stores/message';
import MenuMessagesItem from './MenuMessagesItem.vue';

const mStore = useMessageStore();
const scrollAreaRef = ref<QScrollArea | null>(null);
const autoScrollEnabled = ref(true);

function isAtBottom(verticalPercentage: number) {
	return verticalPercentage >= 0.98;
}

function handleScroll(details: { verticalPercentage: number }) {
	const atBottom = isAtBottom(details.verticalPercentage);
	if (autoScrollEnabled.value && !atBottom) {
		autoScrollEnabled.value = false;
		return;
	}

	if (!autoScrollEnabled.value && atBottom) {
		autoScrollEnabled.value = true;
	}
}

function scrollToBottom() {
	const scrollArea = scrollAreaRef.value;
	if (!scrollArea) return;
	scrollArea.setScrollPosition('vertical', Number.MAX_SAFE_INTEGER, 0);
}

watch(
	() => mStore.sortedMessages.length,
	async () => {
		if (!autoScrollEnabled.value) return;
		await nextTick();
		scrollToBottom();
	},
	{ immediate: true },
);
</script>

<style scoped>
.menu-messages {
	padding: 8px 10px;
}

.menu-messages__item {
	margin-bottom: 6px;
}

.menu-messages__item:last-child {
	margin-bottom: 0;
}
</style>
