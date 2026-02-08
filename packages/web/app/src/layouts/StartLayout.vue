<template>
	<q-layout view="hHh Lpr fFf">
		<BackgroundSplash />
		<q-page-container>
			<router-view />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import BackgroundSplash from 'src/components/ui/Background/BackgroundSplash.vue';
</script>

<style scoped></style>
