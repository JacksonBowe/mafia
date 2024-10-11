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

export const useLobbies = () => {
	return useQuery({
		queryKey: ['lobbies'],
		queryFn: fetchLobbies,
		retry: false,
		staleTime: Infinity,
	});
};

export const mutHostLobby = () => {
	const queryClient = useQueryClient();
	const lStore = useLobbyStore();
	return useMutation({
		mutationFn: hostLobby,
		onSuccess: (data) => {
			console.log('Host success');
			queryClient.invalidateQueries({ queryKey: ['lobbies'] });

			console.log('Lobby', data);
			queryClient.setQueryData(['me'], (oldData: User) =>
				oldData
					? {
							...oldData,
							lobby: data.id,
						}
					: oldData,
			);

			lStore.setSelectedLobbyId(data.id);
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

export const mutJoinLobby = () => {
	const queryClient = useQueryClient();
	const lStore = useLobbyStore();
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
		},
		onError: (e) => {
			console.error('Join Error', e);
		},
		onSettled: () => {
			lStore.clearJoinLobbyPending();
		},
	});
};

export const mutLeaveLobby = () => {
	const queryClient = useQueryClient();
	const lStore = useLobbyStore();
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

			lStore.clearSelectedLobbyId();
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
