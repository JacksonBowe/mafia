<template>
	<MCard class="">
		<q-scroll-area class="full-height">
			<q-list class="">
				<m-lobby-item
				  v-for="lobby, index in lobbies" :key="lobby.id"
				  class="q-ma-xs"
				  :lobby="lobby"
				  :index="index"
				  dense
				  clickable
				  @click="lStore.setSelectedLobbyId(lobby.id)"
				  :selected="lobby.id === lStore.selectedLobbyId"
				/>
			</q-list>
		</q-scroll-area>
	</MCard>
</template>

<script setup lang="ts">
import { useLobbyStore } from 'src/stores/lobby';
import { MCard } from '../ui/card';
import MLobbyItem from './MLobbyItem.vue';
import { useLobbies } from 'src/composables';

const lStore = useLobbyStore();

const { data: lobbies } = useLobbies();

</script>
