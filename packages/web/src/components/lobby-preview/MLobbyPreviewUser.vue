<template>
	<q-item v-if="user.username" clickable style="padding: 0px;">
		<q-item-section>
			<q-item-label class="ellipsis content-center flex">
				<q-icon v-if="isHost" name="star" class="q-mr-xs" color="yellow-4" />
				{{ user.username }}</q-item-label>
		</q-item-section>
	</q-item>
</template>

<script setup lang="ts">
import type { LobbyUser } from 'src/api/lobby';

defineProps<{
	user: LobbyUser,
	isHost?: boolean
}>();
</script>
