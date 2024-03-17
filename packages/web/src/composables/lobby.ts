import { computed } from 'vue';

import { useQuery, useMutation } from '@tanstack/vue-query';
import { fetchLobbies, hostLobby } from 'src/api/lobby';
import { useLobbyStore } from 'src/stores/lobby';

export const useLobbies = () => {
	return useQuery({
		queryKey: ['lobbies'],
		queryFn: fetchLobbies,
		retry: false,
	});
};

export const mutHostLobby = () => {
	return useMutation({
		mutationFn: hostLobby,
		onSuccess: () => {
			console.log('Host success');
		},
		onError: () => {
			console.log('Host error');
		},
	});
};

export const useSelectedLobby = () => {
	const { data: lobbies } = useLobbies();
	const lStore = useLobbyStore();

	const selectedLobby = computed(() => {
		if (!lobbies.value || !lStore.selectedLobbyId) return null;
		return lobbies.value.find(
			(lobby) => lobby.id === lStore.selectedLobbyId
		);
	});

	return selectedLobby;
};
