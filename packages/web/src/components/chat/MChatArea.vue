<template>
	<div>
		<q-scroll-area ref="chatArea" class="col">
			<div v-for="message in cStore.messages" :key="message.id">
				{{ message.content }}
			</div>
		</q-scroll-area>
	</div>
</template>

<script setup lang="ts">
import { useChatStore } from 'src/stores/message';

const cStore = useChatStore();
</script>
