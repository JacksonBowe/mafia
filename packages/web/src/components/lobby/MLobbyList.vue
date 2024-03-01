<template>
	<MCard class="full-height">
		<q-scroll-area class="full-height">
			<q-list class="">
				<m-lobby-item v-for="lobby in lobbies" :key="lobby.id" :lobby="lobby" dense>
					<q-item-section>
						{{ lobby.id }}
					</q-item-section>
				</m-lobby-item>
			</q-list>
		</q-scroll-area>
	</MCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MCard } from '../ui/card';
import MLobbyItem from './MLobbyItem.vue';
import type { Lobby } from 'src/lib/api/lobby';

// TODO: Replace with actual lobbies
const lobbies = ref<Lobby[]>([
  {
    id: '1',
    type: 'type1',
    createdAt: Date.now(),
    host: { id: 'host1', username: 'Host 1' },
    config: 'config1',
  },
  {
    id: '1',
    type: 'type1',
    createdAt: Date.now(),
    host: { id: 'host1', username: 'Host 1' },
    config: 'config1',
  },
  {
    id: '1',
    type: 'type1',
    createdAt: Date.now(),
    host: { id: 'host1', username: 'Host 1' },
    config: 'config1',
  },
  // ... repeat for 7 more lobbies
]);
</script>
