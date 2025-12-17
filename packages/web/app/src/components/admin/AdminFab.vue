<template>
	<q-page-sticky position="bottom-right" :offset="[18, 18]">
		<q-fab color="primary" glossy icon="construction" push direction="left" :disable="isLoading">
			<!-- LOBBIES -->
			<q-fab color="orange" label="Lobbies" direction="up" padding="xs">
				<q-fab-action
					label="Terminate all"
					hide-icon
					color="red"
					padding="none"
					@click="() => terminateLobbies()"
				/>
			</q-fab>

			<!-- USERS -->
			<!-- <q-fab color="orange" label="Users" direction="up" padding="xs">
				<q-fab-action
					label="Terminate all"
					hide-icon
					color="red"
					padding="none"
					@click="() => {}"
				/>
			</q-fab> -->

			<!-- USERS -->
			<!-- <q-fab color="orange" label="Message" direction="up" padding="xs">
				<q-fab-action
					label="Seed"
					hide-icon
					color="red"
					padding="none"
					@click="seedMessages"
				/>
			</q-fab> -->
		</q-fab>
	</q-page-sticky>
</template>

<script setup lang="ts">
import { useTerminateLobbies } from 'src/lib/admin/hooks';
import { computed } from 'vue';

const { mutateAsync: terminateLobbies, isPending: isTerminateLobbiesPending } =
	useTerminateLobbies();

const isLoading = computed(() => isTerminateLobbiesPending.value);
// import { api } from 'src/boot/axios';
// import { terminateAllLobbies } from 'src/lib/api/admin';
// import { Message } from 'src/lib/chat';
// import { useChatStore } from 'src/stores/chat';
// const seedLobbies = async () => {

// };
// const cStore = useChatStore();
// const seedMessages = (): void => {
// 	const messages: Message[] = [
// 		{
// 			id: 'TODO',
// 			type: 'GLOBAL',
// 			target: 'GLOBAL',
// 			content: 'This is a global message',
// 			timestamp: new Date().getTime(),
// 			sender: {
// 				id: 'TODO',
// 				username: 'GlobalSender',
// 			},
// 		},
// 		{
// 			id: 'TODO',
// 			type: 'LOBBY',
// 			target: 'Lobby123',
// 			content: 'This is a lobby message',
// 			timestamp: new Date().getTime(),
// 			sender: {
// 				id: 'TODO',
// 				username: 'LobbySender',
// 			},
// 		},
// 		{
// 			id: 'TODO',
// 			type: 'PRIVATE',
// 			target: 'User123',
// 			content: 'This is a private message',
// 			timestamp: new Date().getTime(),
// 			sender: {
// 				id: 'TODO',
// 				username: 'PrivateSender',
// 			},
// 		},
// 		{
// 			id: 'TODO',
// 			type: 'SYSTEM',
// 			target: 'User123',
// 			content: 'This is a system message',
// 			timestamp: new Date().getTime(),
// 		},
// 		{
// 			id: 'TODO',
// 			type: 'INFO',
// 			target: 'User123',
// 			content: 'This is an info message',
// 			timestamp: new Date().getTime(),
// 		},
// 	];

// 	messages.forEach((message) => {
// 		cStore.messages.push(message);
// 	});
// };
</script>
