import { useChatStore } from 'src/stores/chat';
import { type LobbyUser, LobbyUserSchema } from './models';
import type { EventBus } from 'quasar';
// import { useQueryClient } from '@tanstack/vue-query';

export type LobbyEvents = {
	'lobby.user-join': (properties: LobbyUser) => void;
	'lobby.user-leave': (properties: LobbyUser) => void;
};

export function registerLobbyEvents(bus: EventBus<LobbyEvents>) {
	console.log('LOADING LOBBY EVENTS');
	// const queryClient = useQueryClient();

	bus.on('lobby.user-join', (properties: LobbyUser) => {
		console.log('User join Lobby', properties);
		const lobby_user = LobbyUserSchema.parse(properties);
		console.log(lobby_user);
		const cStore = useChatStore();

		cStore.newInfoMessage(`${lobby_user.username} has joined the Lobby`);

		// queryClient.invalidateQueries({ queryKey: ['lobbies'] });
	});

	bus.on('lobby.user-leave', (properties: LobbyUser) => {
		console.log('User leave Lobby', properties);
		const lobby_user = LobbyUserSchema.parse(properties);
		console.log(lobby_user);
		const cStore = useChatStore();

		cStore.newInfoMessage(`${lobby_user.username} has left the Lobby`);

		// queryClient.invalidateQueries({ queryKey: ['lobbies'] });
	});
}
