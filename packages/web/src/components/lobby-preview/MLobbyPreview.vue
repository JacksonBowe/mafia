<template>
	<MCard class="row text-white">
		<q-card-section class="col">
			<MLobbyPreviewUsers class="fit" />
		</q-card-section>
		<q-card-section class="col">
			<MLobbyPreviewUsers class="fit"/>
			<!-- <MLobbyPreviewConfig /> -->
		</q-card-section>
	</MCard>
</template>

<script setup lang="ts">
import { MCard } from '../ui/card';
import MLobbyPreviewUsers from './MLobbyPreviewUsers.vue';
import MLobbyPreviewConfig from './MLobbyPreviewConfig.vue';
</script>
