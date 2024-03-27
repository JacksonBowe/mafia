<template>
	<MCard class="text-white column">
		<MCardHeader dense :denser="$q.screen.lt.md">
			<q-tabs
				v-model="tab"
				active-class="active-tab"
				:dense="$q.screen.lt.md"
				animated
				no-caps
				align="justify"
				indicator-color="transparent"
				class="text-h6 tab-title"
			>
				<q-tab name="join" :ripple="false">Join</q-tab>
				<span class="tab-title">|</span>
				<q-tab name="host" :ripple="false">Host</q-tab>
			</q-tabs>
		</MCardHeader>
		<MCardContent class="col q-pt-xs">
			<q-tab-panels
				v-model="tab"
				animated
				class="full-height bg-transparent q-pa-none"
			>
				<q-tab-panel name="join" class="q-pa-none">
					<MLobbyList class="fit" />
				</q-tab-panel>
				<q-tab-panel name="host" class="q-pa-none">
					<MLobbyHost class="fit" />
				</q-tab-panel>
			</q-tab-panels>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MCard, MCardHeader, MCardContent } from 'src/components/ui/card';
import MLobbyList from './MLobbyList.vue';
import MLobbyHost from './MLobbyHost.vue';
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
