<template>
	<MCard title="Lobbies" class="column">
		<div class="bg-pink full-height">
			<q-tabs
				v-model="tab"
				active-class="active-tab"
				indicator-color="accent"
				:dense="$q.screen.lt.md"
				align="justify"
				class="q-mb-md"
			>
				<q-tab name="join" label="All Lobbies" :ripple="false" />
				<span class="tab-title">|</span>
				<q-tab name="host" label="Favorites" :ripple="false" />
			</q-tabs>
		</div>
		<!-- <div class="fit"> -->

		<!-- <div class="bg-green col full-height"></div>
		<q-tab-panels v-model="tab" animated class="full-heigh bg-red col">
			<q-tab-panel name="join">
				<div class="text-body2 text-grey-4">List of all available lobbies to join.</div>
			</q-tab-panel>

			<q-tab-panel name="host">
				<div class="text-body2 text-grey-4">List of your favorite lobbies.</div>
			</q-tab-panel>
		</q-tab-panels> -->
	</MCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MCard from '../ui/Card/MCard.vue';

const tab = ref('join');
</script>

<style>
.q-tab .q-focus-helper {
	visibility: hidden;
}

.tab-title {
	color: rgba(255, 255, 255, 0.3);
}

.active-tab {
	color: rgba(255, 255, 255, 1);
}
</style>
