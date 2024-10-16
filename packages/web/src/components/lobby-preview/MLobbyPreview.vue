<template>
	<MCard class="fit row text-white">
		<q-card-section class="col column">
			<MLobbyPreviewUsers class="col" />

			<q-card-actions class="">
				<MLobbyPreviewActions />
			</q-card-actions>
		</q-card-section>
		<q-card-section class="col">
			<!-- <MLobbyPreviewUsers class="fit" /> -->
			<MLobbyPreviewConfig class="fit" />
		</q-card-section>
	</MCard>
</template>

<script setup lang="ts">
import { MCard } from '../ui/card';
import MLobbyPreviewUsers from './MLobbyPreviewUsers.vue';
import MLobbyPreviewActions from './MLobbyPreviewActions.vue';
import MLobbyPreviewConfig from './MLobbyPreviewConfig.vue';
</script>
