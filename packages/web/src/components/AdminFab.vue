<template>
	<q-page-sticky position="bottom-right" :offset="[18, 18]">
		<q-fab color="primary" glossy icon="construction" push direction="left">
			<!-- LOBBIES -->
			<q-fab color="orange" label="Lobbies" direction="up" padding="xs">
				<q-fab-action
					label="Terminate all"
					@click="terminateAllLobbies"
					hide-icon
					color="red"
					padding="none"
				/>
			</q-fab>

			<!-- USERS -->
			<q-fab color="orange" label="Users" direction="up" padding="xs">
				<q-fab-action
					label="Terminate all"
					@click="() => {}"
					hide-icon
					color="red"
					padding="none"
				/>
			</q-fab>
		</q-fab>
	</q-page-sticky>
</template>

<script setup lang="ts">
// import { api } from 'src/boot/axios';
import { terminateAllLobbies } from 'src/lib/api/admin';

// const seedLobbies = async () => {

// };
</script>
src/lib/api/admin
