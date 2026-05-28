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
import AdminFab from 'src/components/admin/AdminFab.vue';
import BackgroundSplash from 'src/components/ui/Background/BackgroundSplash.vue';
import { useGameEvents } from 'src/lib/game/events';
import { useActor } from 'src/lib/meta/hooks';
import { useGameStore } from 'src/stores/game';
import { useRealtime } from 'src/stores/realtime';
import { watch } from 'vue';

const { data: actor } = useActor();
const gameStore = useGameStore();
const realtime = useRealtime();

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
</script>

<style scoped>
/* .layout-root {
	position: relative;
	background: #0d1117;
} */
</style>
