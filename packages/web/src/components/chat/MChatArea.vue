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

const cStore = useChatStore();
</script>
