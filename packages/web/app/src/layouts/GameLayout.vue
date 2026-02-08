<template>
	<q-layout view="hHh Lpr fFf" class="layout-root">
		<q-page-container>
			<router-view />
			<AdminFab v-if="actor?.isAdmin" />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import AdminFab from 'src/components/admin/AdminFab.vue';
import { useActor } from 'src/lib/meta/hooks';

const { data: actor } = useActor();
</script>

<style scoped>
.layout-root {
	position: relative;
	background: #0d1117;
}
</style>
