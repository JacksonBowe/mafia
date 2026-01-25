import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', {
	state: () => ({
		currentGameId: null as string | null,
		transitionPending: false,
	}),
	getters: {
		hasActiveGame: (s) => !!s.currentGameId,
	},
	actions: {
		startTransition() {
			this.transitionPending = true;
		},
		completeTransition(gameId: string | null) {
			this.currentGameId = gameId;
			this.transitionPending = false;
		},
		clearGame() {
			this.currentGameId = null;
			this.transitionPending = false;
		},
	},
});
