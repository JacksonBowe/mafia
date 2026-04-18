import type { GameSync, SyncActor, SyncEngineState, SyncPlayer } from '@mafia/core/game/index';
import { defineStore } from 'pinia';
import { fetchGameSync } from 'src/lib/game/api';

/**
 * Lifecycle states:
 * - idle: no game, resting state
 * - transitioning: lobby→game handoff in progress (loading spinner shown)
 * - syncing: first full sync in progress (loading UI shown)
 * - ready: game data hydrated, UI can render
 * - error: sync or hydration failed
 */
export type GameStoreStatus = 'idle' | 'transitioning' | 'syncing' | 'ready' | 'error';

export const useGameStore = defineStore('game', {
	state: () => ({
		status: 'idle' as GameStoreStatus,
		currentGameId: null as string | null,
		gameSync: null as GameSync | null,
		error: null as string | null,
		phaseMeta: null as { phase: string; duration: number } | null,
		/** Server-authoritative timestamp (ms) of the last applied sync */
		lastSyncTs: 0,
	}),
	getters: {
		hasActiveGame: (s) => !!s.currentGameId,
		isReady: (s) => s.status === 'ready' && !!s.gameSync,
		/** Convenience: the public engine state */
		engineState: (s): SyncEngineState | null => s.gameSync?.engineState ?? null,
		/** Convenience: the player list */
		players: (s): SyncPlayer[] => s.gameSync?.players ?? [],
		/** Convenience: this user's private actor data */
		actor: (s): SyncActor | null => s.gameSync?.actor ?? null,
		/** Convenience: current game phase */
		phase: (s): string | null => s.gameSync?.phase ?? null,
		/** Convenience: poll count */
		pollCount: (s): number => s.gameSync?.pollCount ?? 0,

		// Keep backward compat for code checking currentGame / transitionPending
		currentGame: (s) => s.gameSync,
		transitionPending: (s) => s.status === 'transitioning',
	},
	actions: {
		/**
		 * Called when lobby.started event arrives.
		 * Sets the loading state before presence triggers navigation.
		 */
		startTransition() {
			this.status = 'transitioning';
			this.error = null;
		},

		/**
		 * Called by App.vue when presence.gameId changes.
		 *
		 * Invariant: currentGameId can only transition null→id or id→null.
		 * A direct gameA→gameB transition is not valid; clear first.
		 */
		completeTransition(gameId: string | null) {
			if (!gameId) {
				this.clearGame();
				return;
			}

			// Enforce invariant: cannot switch between two different games
			if (this.currentGameId && this.currentGameId !== gameId) {
				console.error(
					`[game-store] Illegal gameId transition ${this.currentGameId} → ${gameId}; clearing first`,
				);
				this.clearGame();
			}

			this.currentGameId = gameId;

			// Bootstrap sync when not yet ready
			if (this.status !== 'ready') {
				void this.syncFromServer();
			}
		},

		/**
		 * Fetch game state from /game/me/sync and hydrate the store.
		 *
		 * When the store is already `ready`, this runs as a background
		 * reconciliation — the status stays `ready` so the UI doesn't
		 * flash a loading state.
		 */
		async syncFromServer() {
			const isBackground = this.status === 'ready';

			if (!isBackground) {
				this.status = 'syncing';
			}
			this.error = null;

			try {
				const syncData = await fetchGameSync();

				// Guard: store may have been cleared while the request was in-flight
				if (this.status === 'idle') return;

				if (syncData) {
					this.hydrateFromSync(syncData);
				} else if (!isBackground) {
					this.status = 'error';
					this.error = 'No active game found';
				}
			} catch (e) {
				// Only surface errors on bootstrap syncs; background failures are silent
				if (!isBackground) {
					this.status = 'error';
					this.error = e instanceof Error ? e.message : 'Sync failed';
				}
				console.error('Game sync failed:', e);
			}
		},

		/**
		 * Hydrate the store from a GameSync payload (from HTTP or realtime).
		 *
		 * Guards:
		 * - Rejects payloads whose `syncTs` is not newer than the last applied sync.
		 * - Rejects payloads for a different game than `currentGameId` (if set).
		 */
		hydrateFromSync(sync: GameSync) {
			// Stale response — discard
			if (sync.syncTs <= this.lastSyncTs) {
				return;
			}

			// Wrong game — discard
			if (this.currentGameId && sync.gameId !== this.currentGameId) {
				console.warn(
					`[game-store] Discarding sync for ${sync.gameId}; active game is ${this.currentGameId}`,
				);
				return;
			}

			this.gameSync = sync;
			this.currentGameId = sync.gameId;
			this.lastSyncTs = sync.syncTs;
			this.phaseMeta = { phase: sync.phase, duration: 0 };
			this.status = 'ready';
			this.error = null;
		},

		/**
		 * Update phase metadata from a realtime phase change event.
		 */
		applyPhaseEvent(phase: string, duration: number) {
			this.phaseMeta = { phase, duration };
			if (this.gameSync) {
				this.gameSync = { ...this.gameSync, phase: phase as GameSync['phase'] };
			}
		},

		/**
		 * Update public engine state from a realtime state event.
		 */
		applyStateEvent(state: SyncEngineState) {
			if (this.gameSync) {
				this.gameSync = { ...this.gameSync, engineState: state };
			}
		},

		/**
		 * Legacy compat: setPhaseMeta
		 */
		setPhaseMeta(phaseMeta: { phase: string; duration: number } | null) {
			this.phaseMeta = phaseMeta;
		},

		/**
		 * Legacy compat: setCurrentGame — triggers a sync instead.
		 */
		setCurrentGame(game: { id: string } | null) {
			if (!game) {
				this.clearGame();
				return;
			}
			this.completeTransition(game.id);
		},

		/**
		 * Reset the store to idle state.
		 */
		clearGame() {
			this.status = 'idle';
			this.currentGameId = null;
			this.gameSync = null;
			this.phaseMeta = null;
			this.error = null;
			this.lastSyncTs = 0;
		},
	},
});
