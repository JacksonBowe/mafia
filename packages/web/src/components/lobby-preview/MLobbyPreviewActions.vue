<template>
	<q-btn
		color="positive"
		:size="$q.screen.lt.lg ? 'sm' : 'md'"
		glossy
		push
		:disable="joinDisabled"
		:loading="mutJoin.isPending.value"
		@click="joinLobby"
		>Put me in Coach!</q-btn
	>
	<q-btn
		color="negative"
		:size="$q.screen.lt.lg ? 'sm' : 'md'"
		glossy
		push
		:disable="leaveDisabled"
		:loading="mutLeave.isPending.value"
		@click="leaveLobby"
		>Get me out!</q-btn
	>
</template>

<script setup lang="ts">
import { useSelectedLobby, useMe } from 'src/composables';
import { useLobbyStore } from 'src/stores/lobby';
import { computed } from 'vue';
import { mutJoinLobby, mutLeaveLobby } from 'src/composables';

const { data: me } = useMe();
const lStore = useLobbyStore();
const selectedLobby = useSelectedLobby();

const joinDisabled = computed(() => {
	console.log(selectedLobby.value);
	console.log(me.value?.lobby);
	return !selectedLobby.value || me.value?.lobby !== null;
});

const leaveDisabled = computed(() => {
	return !me.value?.lobby;
});

// const startDisabled = computed(() => {
// 	return false;
// });

const mutJoin = mutJoinLobby();
const joinLobby = () => {
	console.log('Join lobby', lStore.selectedLobbyId);
	mutJoin.mutate({ lobbyId: lStore.selectedLobbyId });
};

const mutLeave = mutLeaveLobby();
const leaveLobby = () => {
	console.log('Leave lobby', me.value?.lobby);
	mutLeave.mutate();
};

// const startLobby = () => {
// 	console.log('Start lobby', me.value?.lobby);
// };
</script>
