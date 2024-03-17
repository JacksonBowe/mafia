<template>
	<q-list class="column col">
		<q-scroll-area class="col" dense :thumb-style="thumbStyle">
			<q-list dense>
				<MLobbyPreviewUser v-for="user in props.users" :key="user.id" class="col" :user="user" :is-host="user.id === selectedLobby?.host.id" ></MLobbyPreviewUser>
			</q-list>
		</q-scroll-area>
	</q-list>
</template>

<script setup lang="ts">
import MLobbyPreviewUser from './MLobbyPreviewUser.vue';;
import type { LobbyUser } from 'src/api/lobby';
import { useSelectedLobby } from 'src/composables';


const props = defineProps<{
	users?: LobbyUser[],
}>();

const { selectedLobby } = useSelectedLobby();

const thumbStyle = {
	right: '0px',
	borderRadius: '5px',
	backgroundColor: '#26A69A',
	width: '2px',
	opacity: '0.75'
}

</script>
