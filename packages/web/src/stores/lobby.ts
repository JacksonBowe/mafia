import { defineStore } from 'pinia';

export const useLobbyStore = defineStore('lobby', {
	state: () => ({
		selectedLobbyId: '',
	}),

	getters: {},

	actions: {
		setSelectedLobbyId(lobbyId: string) {
			this.selectedLobbyId = lobbyId;
		},
		clearSelectedLobbyId() {
			this.selectedLobbyId = '';
		},
	},
});
