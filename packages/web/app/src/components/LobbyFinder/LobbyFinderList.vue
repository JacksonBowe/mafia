<template>
	<q-scroll-area>
		<q-list>
			<LobbyFinderListItem
				v-for="(lobby, index) in lobbies"
				:key="lobby.id"
				class="q-ma-xs"
				:lobby="lobby"
				:index="index"
				:dense="$q.screen.lt.md"
				clickable
				:selected="lobby.id === lStore.selectedLobbyId"
				:disable="dataLoading || presence?.lobby !== null"
				@preview="lStore.setSelectedLobbyId(lobby.id)"
				@join="doJoin(lobby.id)"
			/>
		</q-list>
		<q-btn
			class="absolute-bottom-right q-ma-sm"
			fab-mini
			:loading="dataLoading"
			:disabled="lStore.lobbyActionPending"
			push
			glossy
			icon="refresh"
			color="secondary"
			padding="xs"
			@click="refreshLobbies"
		></q-btn>
	</q-scroll-area>
</template>

<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { useQuasar } from 'quasar';
import { useJoinLobby, useLobbies } from 'src/lib/lobby/hooks';
import { usePresence } from 'src/lib/meta/hooks';
import { useLobbyStore } from 'src/stores/lobby';
import { computed } from 'vue';
import LobbyFinderListItem from './LobbyFinderListItem.vue';

const $q = useQuasar();

const queryClient = useQueryClient();

const lStore = useLobbyStore();
const { data: lobbies, isFetching } = useLobbies();

const { data: presence, isLoading } = usePresence();
const { mutateAsync: joinLobby, isPending: isJoinPending } = useJoinLobby();

const dataLoading = computed(() => {
	return (
		isFetching.value ||
		lStore.joinLobbyPending ||
		lStore.leaveLobbyPending ||
		isLoading.value ||
		isJoinPending.value
	);
});

const refreshLobbies = async () => {
	await queryClient.invalidateQueries({ queryKey: ['lobbies'] });
};

const doJoin = async (lobbyId: string) => {
	await joinLobby(lobbyId);
};
</script>
