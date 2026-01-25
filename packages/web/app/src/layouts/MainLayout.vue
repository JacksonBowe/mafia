<template>
	<q-layout view="hHh Lpr fFf" class="layout-root">
		<BackgroundSplash />

		<MenuHeader />
		<q-page-container>
			<router-view />
			<AdminFab v-if="actor?.isAdmin" />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import AdminFab from 'src/components/admin/AdminFab.vue';
import MenuHeader from 'src/components/MenuHeader/MenuHeader.vue';
import BackgroundSplash from 'src/components/ui/Background/BackgroundSplash.vue';
import { useChatEvents } from 'src/lib/chat/events';
import { useLobbyEvents } from 'src/lib/lobby/events';
import { useActor, usePresence } from 'src/lib/meta/hooks';
import { useAuthStore } from 'src/stores/auth';
import { useRealtime } from 'src/stores/realtime';

const rt = useRealtime();
const auth = useAuthStore();
const { data: actor } = useActor();
const { data: presence } = usePresence();

useChatEvents();
useLobbyEvents();

rt.subscribe('chat/menu/global');

watch(
	() => auth.userId,
	(next, prev) => {
		if (prev) rt.unsubscribe(`chat/menu/private/${prev}`);
		if (next) rt.subscribe(`chat/menu/private/${next}`);
	},
	{ immediate: true },
);

watch(
	() => presence.value?.lobby?.id ?? null,
	(next, prev) => {
		if (prev) rt.unsubscribe(`chat/menu/lobby/${prev}`);
		if (next) rt.subscribe(`chat/menu/lobby/${next}`);

		// TODO: Grace-period reconnect strategy
		// docs/realtime/reconnect-grace-period.md
	},
);
</script>

<style scoped>
.layout-root {
	position: relative;
}

.header-card {
	width: min(960px, 92vw);
}

/* background handled by BackgroundSplash */
</style>
