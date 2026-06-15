<template>
	<q-layout view="hHh Lpr fFf" class="layout-root">
		<BackgroundSplash />
		<q-page-container>
			<router-view />

			<AdminFab v-if="actor?.isAdmin" />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { resolveGameChatSubscriptionTopics } from '@mafia/sdk';
import AdminFab from 'src/components/admin/AdminFab.vue';
import BackgroundSplash from 'src/components/ui/Background/BackgroundSplash.vue';
import { useChatEvents } from 'src/lib/chat/events';
import { useGameEvents } from 'src/lib/game/events';
import { useActor } from 'src/lib/meta/hooks';
import { useGameStore } from 'src/stores/game';
import { useRealtime } from 'src/stores/realtime';
import { onUnmounted, ref, watch } from 'vue';

const { data: actor } = useActor();
const gameStore = useGameStore();
const realtime = useRealtime();
const activeChatTopics = ref<string[]>([]);

useChatEvents();
useGameEvents();

watch(
	() => gameStore.info?.id,
	(next, prev) => {
		if (prev) {
			realtime.unsubscribe(`game/${prev}`);
		}

		if (next) {
			realtime.subscribe(`game/${next}`);
		}
	},
	{ immediate: true },
);

watch(
	() => ({
		gameId: gameStore.info?.id ?? null,
		actorId: gameStore.actor?.id ?? null,
		alive: gameStore.actor?.alive ?? null,
		alignment: gameStore.actor?.alignment ?? null,
	}),
	({ gameId }) => {
		for (const topic of activeChatTopics.value) {
			realtime.unsubscribe(topic);
		}

		activeChatTopics.value = gameId
			? resolveGameChatSubscriptionTopics({ gameId, actor: gameStore.actor })
			: [];

		for (const topic of activeChatTopics.value) {
			realtime.subscribe(topic);
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	if (gameStore.info?.id) {
		realtime.unsubscribe(`game/${gameStore.info.id}`);
	}

	for (const topic of activeChatTopics.value) {
		realtime.unsubscribe(topic);
	}
});
</script>

<style scoped>
/* .layout-root {
	position: relative;
	background: #0d1117;
} */
</style>
