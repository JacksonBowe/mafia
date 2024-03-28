<template>
	<MCard class="">
		<q-scroll-area class="full-height">
			<q-list class="">
				<m-lobby-item
					v-for="(lobby, index) in lobbies"
					:key="lobby.id"
					class="q-ma-xs"
					:lobby="lobby"
					:index="index"
					:dense="$q.screen.lt.md"
					clickable
					:selected="lobby.id === lStore.selectedLobbyId"
					:disable="isFetching"
					@click="lStore.setSelectedLobbyId(lobby.id)"
				/>
			</q-list>
			<q-btn
				class="absolute-bottom-right q-ma-sm"
				fab-mini
				:loading="isFetching"
				push
				glossy
				icon="refresh"
				color="secondary"
				padding="xs"
				@click="refreshLobbies"
			></q-btn>
		</q-scroll-area>
	</MCard>
</template>

<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import { useLobbyStore } from 'src/stores/lobby';
import { MCard } from '../ui/card';
import MLobbyItem from './MLobbyItem.vue';
import { useLobbies } from 'src/composables';

const queryClient = useQueryClient();

const lStore = useLobbyStore();

const { data: lobbies, isFetching } = useLobbies();

const refreshLobbies = () => {
	lStore.clearSelectedLobbyId();
	queryClient.invalidateQueries({ queryKey: ['lobbies'] });
};
</script>
