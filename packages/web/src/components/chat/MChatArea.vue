<template>
	<div class="fit">
		<q-scroll-area ref="chatArea" class="fit">
			<div v-for="message in cStore.messages" :key="message.id">
				<MChatMessage :message="message" />
			</div>
		</q-scroll-area>
	</div>
</template>

<script setup lang="ts">
import { useChatStore } from 'src/stores/message';
import MChatMessage from './MChatMessage.vue';
import { watch, ref } from 'vue';
import { QScrollArea } from 'quasar';

const chatArea = ref<InstanceType<typeof QScrollArea> | null>(null);
const cStore = useChatStore();

watch(
	() => cStore.messages,
	() => {
		chatArea.value?.setScrollPercentage('vertical', 100, 1000);
	},
	{ deep: true, immediate: true }
);
</script>
