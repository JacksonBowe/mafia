<template>
	<q-btn
		color="positive"
		:size="$q.screen.lt.lg ? 'sm' : 'md'"
		glossy
		push
		:disable="joinDisabled"
		@click="joinLobby"
		>Put me in Coach!</q-btn
	>
	<q-btn
		color="negative"
		:size="$q.screen.lt.lg ? 'sm' : 'md'"
		glossy
		push
		:disable="leaveDisabled"
		@click="leaveLobby"
		>Get me out!</q-btn
	>
</template>

<script setup lang="ts">
import { useSelectedLobby, useMe } from 'src/composables';
import { useLobbyStore } from 'src/stores/lobby';
import { computed } from 'vue';

const { data: me } = useMe();
const lStore = useLobbyStore();
const selectedLobby = useSelectedLobby();

console.log(selectedLobby.value);

const joinDisabled = computed(() => {
	return !selectedLobby.value;
});

const leaveDisabled = computed(() => {
	return !me.value?.lobby;
});

const startDisabled = computed(() => {
	return false;
});

const joinLobby = () => {
	console.log('Join lobby', lStore.selectedLobbyId);
};

const leaveLobby = () => {
	console.log('Leave lobby', me.value?.lobby?.id);
};

const startLobby = () => {
	console.log('Start lobby', me.value?.lobby?.id);
};
</script>
