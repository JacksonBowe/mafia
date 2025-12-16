<template>
	<MCard class="fit text-white" variant="glass" size="lg">
		<MCardHeader title="Lobby Finder" subtitle="Join or Host a lobby" />

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

		<MCardContent class="fit">
			<q-tab-panels v-model="tab" animated class="full-height bg-transparent rounded-borders">
				<q-tab-panel name="join" class="q-pa-none bg-dark">
					<LobbiesList class="fit bg-re" />
				</q-tab-panel>

				<q-tab-panel name="host" class="q-pa-none">
					<LobbyHostForm class="fit" @submit="tab = 'join'" />
				</q-tab-panel>
			</q-tab-panels>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
import { ref } from 'vue';
import LobbiesList from './LobbiesList.vue';
import LobbyHostForm from './LobbyHostForm.vue';

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
