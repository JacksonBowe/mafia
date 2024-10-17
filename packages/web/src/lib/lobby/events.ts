import { inject, onMounted, onUnmounted } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useChatStore } from 'src/stores/chat';
import { type LobbyUser, LobbyUserSchema } from './models';
import type { EventBus } from 'quasar';
import { useMe } from '../user';

export type LobbyEvents = {
	'lobby.user-join': (properties: LobbyUser) => void;
	'lobby.user-leave': (properties: LobbyUser) => void;
	'lobby.new-host': (properties: LobbyUser) => void;
};

// Function to register lobby event listeners
export function useLobbyEvents() {
	// Inject the globally provided EventBus
	const bus = inject<EventBus<LobbyEvents>>('bus');
	// Use QueryClient inside the reactive context
	const queryClient = useQueryClient();
	const { data: me } = useMe();

	if (!bus) {
		throw new Error('EventBus not provided');
	}

	// Register event listeners when the component is mounted
	onMounted(() => {
		console.log('LOADING LOBBY EVENTS');

		// Event listener for 'lobby.user-join'
		bus.on('lobby.user-join', (properties: LobbyUser) => {
			console.log('User join Lobby', properties);
			const lobby_user = LobbyUserSchema.parse(properties);
			console.log(lobby_user);
			const cStore = useChatStore();

			if (me.value && me.value.id === lobby_user.id) {
				cStore.newInfoMessage('You have joined the Lobby');
			} else {
				cStore.newInfoMessage(
					`${lobby_user.username} has joined the Lobby`,
				);
			}

			// Invalidate queries related to 'lobbies'
			queryClient.invalidateQueries({ queryKey: ['lobbies'] });
		});

		// Event listener for 'lobby.user-leave'
		bus.on('lobby.user-leave', (properties: LobbyUser) => {
			console.log('User leave Lobby', properties);
			const lobby_user = LobbyUserSchema.parse(properties);
			console.log(lobby_user);
			const cStore = useChatStore();

			cStore.newInfoMessage(`${lobby_user.username} has left the Lobby`);

			// Invalidate queries related to 'lobbies'
			queryClient.invalidateQueries({ queryKey: ['lobbies'] });
		});

		bus.on('lobby.new-host', (properties: LobbyUser) => {
			console.log('New Host', properties);
			const lobby_user = LobbyUserSchema.parse(properties);
			console.log(lobby_user);
			const cStore = useChatStore();

			cStore.newInfoMessage(`${lobby_user.username} is the new Host`);

			// Invalidate queries related to 'lobbies'
			queryClient.invalidateQueries({ queryKey: ['lobbies'] });
		});
	});

	// Clean up event listeners when the component is unmounted
	onUnmounted(() => {
		bus.off('lobby.user-join');
		bus.off('lobby.user-leave');
		bus.off('lobby.new-host');
	});
}
