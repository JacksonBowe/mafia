<template>
	<div class="flex justify-between">
		<q-btn
			v-if="leaveDisabled"
			color="positive"
			:size="q.screen.lt.lg ? 'sm' : 'md'"
			glossy
			push
			:disable="joinDisabled"
			:loading="mutJoin.isPending.value"
			@click="joinLobby"
			>Put me in Coach!</q-btn
		>
		<q-btn
			v-else-if="joinDisabled"
			color="primary"
			:size="q.screen.lt.lg ? 'sm' : 'md'"
			glossy
			push
			@click="startLobby"
			>Start!
		</q-btn>

		<q-btn
			color="negative"
			:size="q.screen.lt.lg ? 'sm' : 'md'"
			glossy
			push
			:disable="leaveDisabled"
			:loading="mutLeave.isPending.value"
			@click="leaveLobby"
			>Get me out!</q-btn
		>
	</div>
</template>

<script setup lang="ts">
import { useLobbyStore } from 'src/stores/lobby';
import { computed } from 'vue';
import { useQuasar } from 'quasar';

import { useJoinLobby, useLeaveLobby, useSelectedLobby } from 'src/lib/lobby';
import { useMe } from 'src/lib/user';

const q = useQuasar();

const { data: me } = useMe();
const lStore = useLobbyStore();
const selectedLobby = useSelectedLobby();

const joinDisabled = computed(() => {
	return !selectedLobby.value || me.value?.lobby !== null;
});

const leaveDisabled = computed(() => {
	return !me.value?.lobby;
});

// TODO: ??
// const startDisabled = computed(() => {
// 	return false;
// });

const mutJoin = useJoinLobby();
const joinLobby = () => {
	console.log('Join lobby', lStore.selectedLobbyId);
	mutJoin.mutate({ lobbyId: lStore.selectedLobbyId });
};

const mutLeave = useLeaveLobby();
const leaveLobby = () => {
	console.log('Leave lobby', me.value?.lobby);
	mutLeave.mutate();
};

const startLobby = () => {
	console.log('Start lobby', me.value?.lobby);
};
</script>
