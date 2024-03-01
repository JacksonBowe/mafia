<template>
	<q-item>
		<q-item-section>
			{{ props.lobby.id }}
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import type { Lobby } from 'src/lib/api/lobby';
const props = withDefaults(defineProps<{
  	lobby: Lobby,
	disable: boolean
}>(), {
	disable: false
});

</script>
