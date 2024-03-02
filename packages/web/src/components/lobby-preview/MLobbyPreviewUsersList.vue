<template>
	<q-list class="column col">
		<q-scroll-area class="col" dense :thumb-style="thumbStyle">
			<div v-for="user in props.users" :key="user.id" class="col" > {{ user.username }}</div>
		</q-scroll-area>
	</q-list>
</template>

<script setup lang="ts">
import type { LobbyUser } from 'src/lib/api/lobby';

const props = defineProps<{
	users?: LobbyUser[],
}>();

const thumbStyle = {
	right: '0px',
	borderRadius: '5px',
	backgroundColor: '#26A69A',
	width: '2px',
	opacity: '0.75'
}

</script>
