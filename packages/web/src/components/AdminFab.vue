<template>
	<q-page-sticky position="bottom-right" :offset="[18, 18]">
  		<q-fab color="primary" glossy icon="construction" push direction="left" >
			<!-- LOBBIES -->
			<q-fab color="orange" label="Lobbies" direction="up" padding="xs" >
				<q-fab-action label="Terminate all" @click="terminateAllLobbies" hide-icon color="red" padding="none" />
			</q-fab>

			<!-- USERS -->
		</q-fab>
	</q-page-sticky>
</template>

<script setup lang="ts">
import { terminateAllLobbies } from 'src/api/lobby';
</script>
src/api/lobby
