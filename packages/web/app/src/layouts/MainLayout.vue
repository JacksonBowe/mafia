<template>
	<q-layout view="hHh Lpr fFf" class="layout-root">
		<BackgroundSplash />

		<MenuHeader />
		<q-page-container>
			<router-view />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
// import { useChatEvents } from 'src/lib/chat'
// import { useLobbyEvents } from 'src/lib/lobby'
// import { useMe } from 'src/lib/user'

import MenuHeader from 'src/components/MenuHeader/MenuHeader.vue';
import BackgroundSplash from 'src/components/ui/Background/BackgroundSplash.vue';
import { useLobbyEvents } from 'src/lib/lobby/events';

// const { data: me, isLoading } = useMe()

// useChatEvents()
useLobbyEvents();
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
