import { computed } from 'vue';
import { useLobbies } from './useLobbies';
import { useLobbyStore } from 'src/stores/lobby';

export const useSelectedLobby = () => {
	const { data: lobbies } = useLobbies();
	const lStore = useLobbyStore();

	const selectedLobby = computed(() => {
		if (!lobbies.value || !lStore.selectedLobbyId) return null;
		return lobbies.value.find(
			(lobby) => lobby.id === lStore.selectedLobbyId
		);
	});

	return { selectedLobby };
};
