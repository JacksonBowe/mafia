<template>
	<MCard class="column">
		<MCardHeader dense >
			Players
		</MCardHeader>
		<q-separator color="primary" inset />
		<MCardContent class="col row q-py-xs" v-if="users?.length">
			<MLobbyPreviewUsersList :users="users?.slice(0, 8)" />
			<q-separator vertical color="accent" class="q-mx-sm" inset />
			<MLobbyPreviewUsersList :users="users?.slice(8, 15)" />
		</MCardContent>
	</MCard>
</template>

<script setup lang="ts">
import { MCard, MCardHeader, MCardContent } from '../ui/card';

import MLobbyPreviewUsersList from './MLobbyPreviewUsersList.vue';

import { useLobbyStore } from 'src/stores/lobby';
import { useLobbies } from 'src/composables';
import { computed, ComputedRef } from 'vue';
import { type LobbyUser } from 'src/api/lobby';

const lStore = useLobbyStore();
const { data: lobbies } = useLobbies();

const users: ComputedRef<LobbyUser[] | null> = computed(() => {
	if (lStore.selectedLobbyId && lobbies.value) {
		const lobby = lobbies.value.find((lobby) => lobby.id === lStore.selectedLobbyId);
		if (lobby && lobby.users) {
			return lobby.users.concat(Array(15).fill({}).slice(0, 15));
		}
	}
	return [];
});
</script>
