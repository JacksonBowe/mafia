<template>
	<router-view />
</template>

<script setup lang="ts">
import { Loading, useQuasar } from 'quasar';
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import { usePresence } from 'src/lib/meta/hooks';
import { useGameStore } from 'src/stores/game';

const $q = useQuasar();
const router = useRouter();
const gameStore = useGameStore();
const { data: presence } = usePresence();

$q.screen.setSizes({
	// Override XL screen size slightly. This means that a 1920x1080 screen will be considered "lg" instead of "xl"
	xl: 2000,
});

$q.dark.set(true);

// Global watcher for game presence routing
watch(
	() => presence.value?.gameId ?? null,
	(gameId) => {
		if (gameId) {
			gameStore.completeTransition(gameId);
			if (router.currentRoute.value.path !== '/game') {
				void router.push('/game');
			}
			return;
		}

		// No game - clear store and redirect away from /game if needed
		if (gameStore.status !== 'transitioning') {
			gameStore.completeTransition(null);
			if (router.currentRoute.value.path === '/game') {
				void router.push('/');
			}
		}
	},
	{ immediate: true },
);

// Hide loading spinner once store transitions out of transitioning/syncing
watch(
	() => gameStore.status,
	(status) => {
		if (status === 'ready' || status === 'error' || status === 'idle') {
			Loading.hide();
		}
	},
);
</script>
