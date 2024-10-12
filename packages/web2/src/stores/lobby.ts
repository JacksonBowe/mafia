import { defineStore } from 'pinia';

export const useLobbyStore = defineStore('lobby', {
	state: () => ({
		selectedLobbyId: '',
		joinLobbyPending: false,
		leaveLobbyPending: false,
	}),

	getters: {
		lobbyActionPending(): boolean {
			return this.joinLobbyPending || this.leaveLobbyPending;
		},
	},

	actions: {
		setSelectedLobbyId(lobbyId: string) {
			this.selectedLobbyId = lobbyId;
		},
		clearSelectedLobbyId() {
			this.selectedLobbyId = '';
		},
		setJoinLobbyPending() {
			this.joinLobbyPending = true;
		},
		clearJoinLobbyPending() {
			this.joinLobbyPending = false;
		},
		setLeaveLobbyPending() {
			this.leaveLobbyPending = true;
		},
		clearLeaveLobbyPending() {
			this.leaveLobbyPending = false;
		},
	},
});
