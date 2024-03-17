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
import type { Lobby } from 'src/api/lobby';

const props = defineProps<{
    lobby: Lobby,
    index: number,
    selected?: boolean
}>();

const backgroundColor = computed(() => {

    switch (props.selected) {
        case true:
            return 'bg-gradient-selected'
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
    background-image: linear-gradient(to bottom, rgba(255, 201, 138, 1), rgba(247, 86, 51, 1));
}

.bg-gradient-lobby-0 {
    background-image: linear-gradient(to bottom, rgba(140, 138, 255, 0.8), rgba(184, 51, 246, 0.8));
}

.bg-gradient-lobby-1 {
    background-image: linear-gradient(to bottom, rgba(100, 98, 195, 0.8), rgba(144, 11, 186, 0.8));
}
</style>
src/api/lobby
