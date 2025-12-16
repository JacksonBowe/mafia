<template>
	<MCard class="fit" variant="glass" size="lg" tone="warning" tone-placement="top" glow>
		<MCardHeader eyebrow="In Lobby" :title="lobby?.name ?? 'Lobby'" :subtitle="lobbyMeta" />

		<MCardContent class="fit column">
			<q-tabs
				v-model="tab"
				:separator="true"
				:dense="$q.screen.lt.md"
				animated
				no-caps
				align="justify"
				indicator-color="transparent"
				class="lobby-tabs text-h6"
			>
				<q-tab name="players" :ripple="false" label="Players" />
				<span class="lobby-tabs">|</span>
				<q-tab name="config" :ripple="false" label="Config" />
			</q-tabs>

			<!-- <q-separator class="q-mt-sm q-mb-md" dark /> -->

			<q-tab-panels v-model="tab" animated class="col rounded-borders bg-transparen">
				<q-tab-panel name="players" class="q-pa-none">
					<!-- <LobbyPlayerList class="fit" /> -->
				</q-tab-panel>

				<q-tab-panel name="config" class="q-pa-none">
					<!-- <LobbyConfig class="fit" /> -->
				</q-tab-panel>
			</q-tab-panels>
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { MCard, MCardContent, MCardHeader } from 'src/components/ui/Card';
import { useLobby } from 'src/lib/lobby/hooks';
import { usePresence } from 'src/lib/meta/hooks';
import { computed, ref } from 'vue';

const tab = ref<'players' | 'config'>('players');

const MAX_PLAYERS = 15;

const { data: presence } = usePresence();
const lobbyId = computed(() => presence.value?.lobby?.id ?? null);

const { data: lobby } = useLobby(lobbyId, { retry: 0 });

const memberCount = computed(() => lobby.value?.members?.length ?? 0);
const occupancyPct = computed(() =>
	MAX_PLAYERS <= 0 ? 0 : Math.round((memberCount.value / MAX_PLAYERS) * 100),
);

const lobbyMeta = computed(() => {
	if (!lobby.value) return 'Loading…';
	return `${memberCount.value}/${MAX_PLAYERS} players · ${occupancyPct.value}%`;
});
</script>

<style scoped lang="scss">
/* only affect tabs inside this component */
.lobby-tabs :deep(.q-tab .q-focus-helper) {
	visibility: hidden;
}

.lobby-tabs :deep(.q-tab) {
	color: rgba(255, 255, 255, 0.38);
}

.lobby-tabs :deep(.q-tab--active) {
	color: rgba(255, 255, 255, 0.95);
}

/* make Quasar separator between tabs subtle */
.lobby-tabs :deep(.q-tabs__separator) {
	opacity: 0.25;
}
</style>
