<template>
	<q-page-sticky position="bottom-right" :offset="[18, 18]">
		<q-fab color="primary" glossy icon="construction" push direction="left">
			<!-- LOBBIES -->
			<q-fab color="orange" label="Lobbies" direction="up" padding="xs">
				<q-fab-action
					label="Terminate all"
					hide-icon
					color="red"
					padding="none"
					@click="terminateAllLobbies"
				/>
			</q-fab>

			<!-- USERS -->
			<q-fab color="orange" label="Users" direction="up" padding="xs">
				<q-fab-action
					label="Terminate all"
					hide-icon
					color="red"
					padding="none"
					@click="() => {}"
				/>
			</q-fab>

			<!-- USERS -->
			<q-fab color="orange" label="Message" direction="up" padding="xs">
				<q-fab-action
					label="Seed"
					hide-icon
					color="red"
					padding="none"
					@click="seedMessages"
				/>
			</q-fab>
		</q-fab>
	</q-page-sticky>
</template>

<script setup lang="ts">
// import { api } from 'src/boot/axios';
import { terminateAllLobbies } from 'src/lib/api/admin';
import { v4 as uuidv4 } from 'uuid';
import { Message } from 'src/lib/api/message';
import { useChatStore } from 'src/stores/message';
// const seedLobbies = async () => {

// };
const cStore = useChatStore();
const seedMessages = (): void => {
	const messages: Message[] = [
		{
			id: uuidv4(),
			type: 'GLOBAL',
			target: 'GLOBAL',
			content: 'This is a global message',
			timestamp: new Date(),
			sender: {
				id: uuidv4(),
				name: 'GlobalSender',
			},
		},
		{
			id: uuidv4(),
			type: 'LOBBY',
			target: 'Lobby123',
			content: 'This is a lobby message',
			timestamp: new Date(),
			sender: {
				id: uuidv4(),
				name: 'LobbySender',
			},
		},
		{
			id: uuidv4(),
			type: 'PRIVATE',
			target: 'User123',
			content: 'This is a private message',
			timestamp: new Date(),
			sender: {
				id: uuidv4(),
				name: 'PrivateSender',
			},
		},
		{
			id: uuidv4(),
			type: 'SYSTEM',
			target: 'User123',
			content: 'This is a system message',
			timestamp: new Date(),
		},
		{
			id: uuidv4(),
			type: 'INFO',
			target: 'User123',
			content: 'This is an info message',
			timestamp: new Date(),
		},
	];

	messages.forEach((message) => {
		cStore.messages.push(message);
	});
};
</script>
