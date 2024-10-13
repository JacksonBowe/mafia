import { useChatStore } from 'src/stores/chat';
import { type LobbyUser, LobbyUserSchema } from './models';
import type { EventBus } from 'quasar';

export type LobbyEvents = {
	'lobby.user-join': (properties: LobbyUser) => void;
};

export function registerLobbyEvents(bus: EventBus<LobbyEvents>) {
	console.log('LOADING LOBBY EVENTS');

	bus.on('lobby.user-join', (properties: LobbyUser) => {
		console.log('User join Lobby', properties);
		const lobby_user = LobbyUserSchema.parse(properties);
		console.log(lobby_user);
		const cStore = useChatStore();

		cStore.newInfoMessage(`${lobby_user.username} has joined the Lobby`);
	});
}
