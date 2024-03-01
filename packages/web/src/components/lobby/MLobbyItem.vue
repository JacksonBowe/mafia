<template>
	<q-item :class="[backgroundColor, 'm-item']">
		<q-item-section class="">
			<q-item-label>{{ props.lobby.name }}</q-item-label>
		</q-item-section>
		<q-item-section side class="text-white">
			{{ props.lobby.users?.length }} / 15
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Lobby } from 'src/lib/api/lobby';
const props = withDefaults(defineProps<{
  	lobby: Lobby,
	index: number
}>(), {
});

const backgroundColor = computed(() => {

switch (props.lobby.id) {
	// TODO
	// case lStore.currentLobbyId:
	// 	return 'bg-gradient-current'
	// case lStore.selectedLobbyId:
	// 	return 'bg-gradient-selected'
	default:
		return `bg-gradient-lobby-${props.index % 2}`
}

})

</script>

<style scoped>

.m-item {
		border-radius: 10px;
        box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
	}

.bg-gradient-selected {
	background-image: linear-gradient(to bottom, rgba(255, 138, 138, 1), rgba(247, 51, 227, 1));

}
.bg-gradient-lobby-0 {
	background-image: linear-gradient(to bottom, rgba(140, 138, 255, 0.8), rgba(184, 51, 246, 0.8));
}

.bg-gradient-lobby-1 {
	background-image: linear-gradient(to bottom, rgba(100, 98, 195, 0.8), rgba(144, 11, 186, 0.8));
}
</style>
