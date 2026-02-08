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
			Loading.hide();
			if (router.currentRoute.value.path !== '/game') {
				void router.push('/game');
			}
			return;
		}

		// No game - clear store and redirect away from /game if needed
		if (!gameStore.transitionPending) {
			gameStore.completeTransition(null);
			if (router.currentRoute.value.path === '/game') {
				void router.push('/');
			}
		}
	},
	{ immediate: true },
);
</script>
