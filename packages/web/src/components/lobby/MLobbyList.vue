<template>
	<MCard class="full-height">
		<q-scroll-area class="full-height">
			<q-list class="">
				<m-lobby-item v-for="lobby, index in lobbies" :key="lobby.id" class="q-ma-xs" :lobby="lobby" :index="index" dense clickable />
			</q-list>
		</q-scroll-area>
	</MCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MCard } from '../ui/card';
import MLobbyItem from './MLobbyItem.vue';
import type { Lobby, LobbyUser } from 'src/lib/api/lobby';

// TODO: Replace with actual lobbies
const lobbies = ref<Lobby[]>(generateLobbies(20));

// TODO <DEPR>: Remove this function and replace with actual lobbies
function generateLobbies(n: number): Lobby[] {
  const lobbies: Lobby[] = [];


  for (let i = 0; i < n; i++) {
	let users: LobbyUser[] = []
	for (let j = 0; j < i+1 && j < 15; j++) {
		users.push({
			id: `user${j + 1}`,
			createdAt: Date.now(),
			type: 'LOBBY_USER',
			username: `User ${j + 1}`,
			lobbyId: `lobby${i + 1}`
		})
  	}
    lobbies.push({
      id: `lobby${i + 1}`,
      type: 'LOBBY',
      createdAt: Date.now(),
	  name: `Lobby ${i + 1}`,
      host: { id: `host${i + 1}`, username: `Host ${i + 1}` },
      config: `config${i + 1}`,
	  users: users,
    });
  }

  return lobbies;
}
</script>
