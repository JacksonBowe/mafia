import { inject, onMounted } from 'vue';
import { useChatStore } from 'src/stores/chat';
import { type LobbyUser, LobbyUserSchema } from './models';
// import { bus } from 'src/boot/bus';
import type { EventBus } from 'quasar';

export type LobbyEvents = {
	'lobby.userjoin': (properties: LobbyUser) => void;
};

console.log('LOADED LOBBY EVENTS');

onMounted(() => {
	const bus = inject('bus') as EventBus;

	bus.on('lobby.userjoin', (properties: LobbyUser) => {
		console.log('User join Lobby', properties);
		const lobby_user = LobbyUserSchema.parse(properties);
		console.log(lobby_user);
		const cStore = useChatStore();

		cStore.newInfoMessage(`${lobby_user.username} has joined the Lobby`);
		// cStore.messages.push(message);
	});
});
