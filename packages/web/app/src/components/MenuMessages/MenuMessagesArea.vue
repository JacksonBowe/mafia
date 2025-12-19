<template>
	<q-scroll-area>
		<div v-for="message in mStore.sortedMessages" :key="message.id">
			<div>{{ message.text }}</div>
		</div>
	</q-scroll-area>
</template>

<script setup lang="ts">
import { useMessageStore } from 'src/stores/message';

const mStore = useMessageStore();
</script>
