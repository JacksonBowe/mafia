// export * from './api';
export * from './models';
export * from './events';


import { computed } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
	fetchLobbies,
	hostLobby,
	joinLobby,
	leaveLobby,
} from 'src/lib/api/lobby';
import { useLobbyStore } from 'src/stores/lobby';
import { type User } from 'src/lib/user';
import { useChatStore } from 'src/stores/chat';
import { useRealtime } from '../realtime';
import { AxiosError } from 'axios';
import { warningNotify } from '../util';

export const useLobbies = () => {
	return useQuery({
		queryKey: ['lobbies'],
		queryFn: fetchLobbies,
		retry: false,
		staleTime: Infinity,
	});
};

export const useHostLobby = () => {
	const queryClient = useQueryClient();
	const lStore = useLobbyStore();
	const cStore = useChatStore();
	const { subscribe } = useRealtime();

	return useMutation({
		mutationFn: hostLobby,
		onSuccess: (lobby) => {
			console.log('Host success');
			queryClient.invalidateQueries({ queryKey: ['lobbies'] });

			console.log('Lobby', lobby);
			queryClient.setQueryData(['me'], (oldData: User) =>
				oldData
					? {
						...oldData,
						lobby: lobby.id,
					}
					: oldData,
			);

			lStore.setSelectedLobbyId(lobby.id);
			cStore.newInfoMessage('You have created a Lobby');
			subscribe(lobby.id);
		},
		onError: (e) => {
			console.error('Host error', e);
		},
		onSettled: () => {
			lStore.clearJoinLobbyPending();
		},
	});
};

export const useSelectedLobby = () => {
	const { data: lobbies } = useLobbies();
	const lStore = useLobbyStore();

	const selectedLobby = computed(() => {
		if (!lobbies.value || !lStore.selectedLobbyId) return null;
		return lobbies.value.find(
			(lobby) => lobby.id === lStore.selectedLobbyId,
		);
	});

	return selectedLobby;
};

export const useJoinLobby = () => {
	const queryClient = useQueryClient();
	const lStore = useLobbyStore();
	const { subscribe } = useRealtime();
	return useMutation({
		mutationFn: joinLobby,
		onMutate: () => {
			lStore.setJoinLobbyPending();
		},
		onSuccess: (data, variables) => {
			console.log('Join Success');
			queryClient.invalidateQueries({ queryKey: ['lobbies'] });

			console.log('Variables', variables);
			queryClient.setQueryData(['me'], (oldData: User) =>
				oldData
					? {
						...oldData,
						lobby: variables.lobbyId,
					}
					: oldData,
			);
			subscribe(variables.lobbyId);
		},
		onError: (e) => {
			console.error('Join Error', e);
			if (e instanceof AxiosError) {
				if (e.response?.status === 404) {
					warningNotify('Lobby not found');
					queryClient.invalidateQueries({ queryKey: ['lobbies'] });
				}
			}
		},
		onSettled: () => {
			lStore.clearJoinLobbyPending();
		},
	});
};

export const useLeaveLobby = () => {
	const queryClient = useQueryClient();
	const lStore = useLobbyStore();
	const cStore = useChatStore();
	const { unsubscribe } = useRealtime();
	return useMutation({
		mutationFn: leaveLobby,
		onMutate: () => {
			console.log('Leave Mutate');
			lStore.setLeaveLobbyPending();
		},
		onSuccess: () => {
			console.log('Leave Success');
			queryClient.invalidateQueries({ queryKey: ['lobbies'] });

			queryClient.setQueryData(['me'], (oldData: User) =>
				oldData
					? {
						...oldData,
						lobby: null,
					}
					: oldData,
			);

			unsubscribe(lStore.selectedLobbyId);
			lStore.clearSelectedLobbyId();

			cStore.newInfoMessage('You have left the lobby');
		},
		onError: (e) => {
			console.error('Leave Error', e);
			queryClient.invalidateQueries({ queryKey: ['me'] });
		},
		onSettled: () => {
			lStore.clearLeaveLobbyPending();
		},
	});
};
