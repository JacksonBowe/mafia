import type {
	ActorState,
	ClientGameInfo,
	GameConfig,
	GamePhase,
	GameState,
	GameSyncResponse,
} from '@mafia/sdk';
import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

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
		info: null as ClientGameInfo | null,
		state: null as GameState | null,
		config: null as GameConfig | null,
		actor: null as ActorState | null,
		error: null as string | null,
		phaseMeta: null as { phase: GamePhase; duration: number } | null,
		/** Server-authoritative timestamp (ms) of the last applied sync */
		lastSyncTs: 0,
	}),
	getters: {
		hasActiveGame: (s) => !!s.info,
		isReady: (s) => s.status === 'ready' && !!s.info,
		/** Convenience: current game phase */
		phase: (s): GamePhase | null => s.info?.phase ?? null,
		/** Convenience: poll count */
		pollCount: (s): number => s.info?.pollCount ?? 0,

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
		 * Invariant: info.id can only transition null→id or id→null.
		 * A direct gameA→gameB transition is not valid; clear first.
		 */
		completeTransition(gameId: string | null) {
			if (!gameId) {
				this.clearGame();
				return;
			}

			// Enforce invariant: cannot switch between two different games
			if (this.info?.id && this.info.id !== gameId) {
				console.error(
					`[game-store] Illegal gameId transition ${this.info.id} → ${gameId}; clearing first`,
				);
				this.clearGame();
			}

			// Bootstrap sync when not yet ready
			if (this.status !== 'ready') {
				void this.syncFromServer();
			}
		},

		/**
		 * Fetch game data from GET /game and hydrate the store.
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
				const data = await api.getGame();

				// Guard: store may have been cleared while the request was in-flight
				if (this.status === 'idle') return;

				if (data) {
					this.hydrateFromSync(data);
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
		 * Hydrate the store from a GameSyncResponse payload (from HTTP or realtime).
		 *
		 * Guards:
		 * - Rejects payloads whose `syncTs` is not newer than the last applied sync.
		 * - Rejects payloads for a different game than the current one (if set).
		 *
		 * Note: `config` is only set on the first sync since config is
		 * immutable once a game has started.
		 */
		hydrateFromSync(sync: GameSyncResponse) {
			// Stale response — discard
			if (sync.info.syncTs <= this.lastSyncTs) {
				return;
			}

			// Wrong game — discard
			if (this.info?.id && sync.info.id !== this.info.id) {
				console.warn(
					`[game-store] Discarding sync for ${sync.info.id}; active game is ${this.info.id}`,
				);
				return;
			}

			this.info = sync.info;
			this.state = sync.state;
			this.actor = sync.actor;
			this.lastSyncTs = sync.info.syncTs;
			this.phaseMeta = { phase: sync.info.phase, duration: 0 };
			this.status = 'ready';
			this.error = null;

			// Config is immutable — only set on first hydration
			if (!this.config) {
				this.config = sync.config;
			}
		},

		/**
		 * Update phase metadata from a realtime phase change event.
		 */
		applyPhaseEvent(phase: GamePhase, duration: number) {
			this.phaseMeta = { phase, duration };
			if (this.info) {
				this.info = { ...this.info, phase };
			}
		},

		/**
		 * Update public engine state from a realtime state event.
		 */
		applyStateEvent(state: GameState) {
			this.state = state;
		},

		/**
		 * Legacy compat: setPhaseMeta
		 */
		setPhaseMeta(phaseMeta: { phase: GamePhase; duration: number } | null) {
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
			this.info = null;
			this.state = null;
			this.config = null;
			this.actor = null;
			this.phaseMeta = null;
			this.error = null;
			this.lastSyncTs = 0;
		},
	},
});
