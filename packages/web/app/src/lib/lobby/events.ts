import type { LobbyInfo, Presence } from '@mafia/sdk';
import { useQueryClient } from '@tanstack/vue-query';
import { Loading, QSpinnerGears } from 'quasar';
import type { AppBus } from 'src/boot/bus';
import { useGameStore } from 'src/stores/game';
import { useRealtime } from 'src/stores/realtime';
import { inject, onMounted, onUnmounted } from 'vue';
import { z } from 'zod';

// Frontend-duplicated schemas (mirror backend)
const ULID = z.string().min(26); // or your own isULID equivalent

export const LobbyEventSchemas = {
	// realtime.*
	'realtime.lobby.member.join': z.object({
		lobbyId: ULID,
		user: z.object({
			id: ULID,
			name: z.string(),
		}),
	}),

	'realtime.lobby.member.leave': z.object({
		lobbyId: ULID,
		userId: ULID,
	}),

	'realtime.lobby.member.promote': z.object({
		lobbyId: ULID,
		userId: ULID,
	}),

	'realtime.lobby.terminated': z.object({
		lobbyId: ULID,
	}),

	'realtime.lobby.started': z.object({
		lobbyId: ULID,
		gameId: ULID,
	}),

	// app.* (optional)
	'app.lobby.toast': z.object({ message: z.string() }),
} as const;

export function useLobbyEvents() {
	const bus = inject<AppBus>('bus');
	if (!bus) throw new Error('Bus not provided');

	const queryClient = useQueryClient();
	const gameStore = useGameStore();
	// const { data: me } = useActor();

	const off: Array<() => void> = [];

	const patchLobby = (lobbyId: string, update: (lobby: LobbyInfo) => LobbyInfo) => {
		queryClient.setQueryData(['lobbies'], (old: LobbyInfo[] | undefined) =>
			old?.map((lobby) => (lobby.id === lobbyId ? update(lobby) : lobby)),
		);
		queryClient.setQueryData(['lobby', lobbyId], (old: LobbyInfo | undefined) =>
			old ? update(old) : old,
		);
	};

	onMounted(() => {
		off.push(
			bus.on('realtime.lobby.member.join', (p) => {
				console.log('join', p.user.name);
				patchLobby(p.lobbyId, (lobby) =>
					lobby.members.some((member) => member.id === p.user.id)
						? lobby
						: { ...lobby, members: [...lobby.members, p.user] },
				);
			}),

			bus.on('realtime.lobby.member.leave', (p) => {
				console.log('leave', p);
				patchLobby(p.lobbyId, (lobby) => ({
					...lobby,
					members: lobby.members.filter((member) => member.id !== p.userId),
				}));
			}),

			bus.on('realtime.lobby.member.promote', (p) => {
				console.log('promote', p);
				void queryClient.invalidateQueries({ queryKey: ['lobbies'] });
			}),

			bus.on('realtime.lobby.terminated', (p) => {
				console.log('lobby terminated', p);
				queryClient.setQueryData(['actor', 'presence'], (old: Presence) =>
					old ? { ...old, lobby: null } : old,
				);
				void queryClient.invalidateQueries({ queryKey: ['lobbies'] });
				void queryClient.invalidateQueries({ queryKey: ['actor', 'presence'] });
				useRealtime().unsubscribe('menu', `menu/lobby/${p.lobbyId}`);
			}),

			bus.on('realtime.lobby.started', (p) => {
				console.log('lobby started', p);
				gameStore.startTransition();
				queryClient.setQueryData(['actor', 'presence'], (old: Presence | undefined) =>
					old ? { ...old, lobby: null, gameId: p.gameId } : old,
				);
				void queryClient.invalidateQueries({ queryKey: ['lobbies'] });
				Loading.show({
					spinner: QSpinnerGears,
					message: 'Starting game…',
				});
				void queryClient.invalidateQueries({ queryKey: ['actor', 'presence'] });
			}),
		);
	});

	onUnmounted(() => off.forEach((fn) => fn()));
}
