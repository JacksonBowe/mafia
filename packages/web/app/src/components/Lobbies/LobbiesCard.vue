<template>
	<MCard class="fit text-white column" variant="glass" size="lg">
		<MCardHeader class="bg-blue" title="Lobby Finder" subtitle="Join or Host a lobby" />

		<MCardContent>
			<q-tabs
				v-model="tab"
				active-class="active-tab"
				:dense="q.screen.lt.md"
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
		</MCardContent>

		<MCardContent class="col">
			<q-tab-panels v-model="tab" animated class="full-height bg-transparent">
				<q-tab-panel name="join" class="q-pa-none">
					fdgfg
					<!-- <MLobbyList class="fit" /> -->
				</q-tab-panel>

				<q-tab-panel name="host" class="q-pa-none">
					dfdf
					<!-- <MLobbyHost class="fit" @submit="tab = 'join'" /> -->
				</q-tab-panel>
			</q-tab-panels>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
import { ref } from 'vue';
// import MLobbyHost from './MLobbyHost.vue';
// import MLobbyList from './MLobbyList.vue';

const q = useQuasar();
const tab = ref<'join' | 'host'>('join');
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
