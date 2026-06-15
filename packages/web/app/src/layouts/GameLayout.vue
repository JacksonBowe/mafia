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
import { useAuthStore } from 'src/stores/auth';
import { useGameStore } from 'src/stores/game';
import { useRealtime, type RealtimeConnectionKey } from 'src/stores/realtime';
import { onUnmounted, ref, watch } from 'vue';

const { data: actor } = useActor();
const auth = useAuthStore();
const gameStore = useGameStore();
const realtime = useRealtime();
const activeChatTopics = ref<string[]>([]);
const activeGameKey = ref<RealtimeConnectionKey | null>(null);

useChatEvents();
useGameEvents();

function syncChatSubscriptions(key: RealtimeConnectionKey, gameId: string) {
	const nextTopics = resolveGameChatSubscriptionTopics({
		gameId,
		actor: gameStore.actor,
	});
	const next = new Set(nextTopics);
	const current = new Set(activeChatTopics.value);

	for (const topic of activeChatTopics.value) {
		if (!next.has(topic)) realtime.unsubscribe(key, topic);
	}

	for (const topic of nextTopics) {
		if (!current.has(topic)) realtime.subscribe(key, topic);
	}

	activeChatTopics.value = nextTopics;
}

function clearActiveConnection(gameId: string | null) {
	if (!activeGameKey.value) return;

	for (const topic of activeChatTopics.value) {
		realtime.unsubscribe(activeGameKey.value, topic);
	}
	if (gameId) {
		realtime.unsubscribe(activeGameKey.value, `game/${gameId}/events`);
	}
	realtime.disconnect(activeGameKey.value, true);
	activeGameKey.value = null;
	activeChatTopics.value = [];
}

function connectGameRealtime(gameId: string, token: string, userId: string) {
	const key = `game:${gameId}` as const;
	activeGameKey.value = key;
	realtime.connect({ scope: 'game', token, userId, gameId });
	realtime.subscribe(key, `game/${gameId}/events`);
	syncChatSubscriptions(key, gameId);
}

watch(
	[
		() => gameStore.info?.id ?? null,
		() => gameStore.isSandbox,
		() => auth.session?.accessToken ?? null,
		() => auth.userId ?? null,
	],
	([gameId, isSandbox, token, userId], [prevGameId]) => {
		clearActiveConnection(prevGameId ?? null);

		if (gameId && !isSandbox && token && userId) {
			connectGameRealtime(gameId, token, userId);
		}
	},
	{ immediate: true },
);

watch(
	[
		() => gameStore.actor?.alive ?? null,
		() => gameStore.info?.id ?? null,
		() => gameStore.isSandbox,
		() => auth.session?.accessToken ?? null,
		() => auth.userId ?? null,
	],
	([alive, gameId, isSandbox, token, userId], [prevAlive]) => {
		if (prevAlive === undefined || prevAlive === null || alive === null || prevAlive === alive) {
			return;
		}
		if (!activeGameKey.value || !gameId || isSandbox || !token || !userId) return;

		clearActiveConnection(gameId);
		connectGameRealtime(gameId, token, userId);
	},
);

watch(
	[
		() => activeGameKey.value,
		() => gameStore.info?.id ?? null,
		() => gameStore.isSandbox,
		() => gameStore.actor?.id ?? null,
		() => gameStore.actor?.alive ?? null,
		() => gameStore.actor?.alignment ?? null,
	],
	([key, gameId, isSandbox]) => {
		if (!key || !gameId || isSandbox) return;
		syncChatSubscriptions(key, gameId);
	},
);

onUnmounted(() => {
	clearActiveConnection(gameStore.info?.id ?? null);
});
</script>

<style scoped>
/* .layout-root {
	position: relative;
	background: #0d1117;
} */
</style>
