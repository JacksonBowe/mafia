import type {
	ActorState,
	ClientGameInfo,
	GameConfig,
	GamePhase,
	GameState,
	GameSyncResponse,
	Verdict,
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
type PhaseMeta = {
	phase: GamePhase;
	duration: number;
	label: string;
	sequence: number;
	stateVersion: number;
	phaseStartedAt: number;
	phaseEndsAt: number;
};

const titleCasePhase = (phase: GamePhase) => phase.charAt(0).toUpperCase() + phase.slice(1);

const getPhaseLabel = (phase: GamePhase, pollCount: number) => {
	if (phase === 'poll') return `Poll ${pollCount + 1}`;
	return titleCasePhase(phase);
};

const getPhaseSequence = (phase: GamePhase, pollCount: number) => {
	if (phase === 'poll') return pollCount;
	return 0;
};

export const useGameStore = defineStore('game', {
	state: () => ({
		status: 'idle' as GameStoreStatus,
		info: null as ClientGameInfo | null,
		state: null as GameState | null,
		config: null as GameConfig | null,
		actor: null as ActorState | null,
		error: null as string | null,
		phaseMeta: null as PhaseMeta | null,
		/** Greatest server-authoritative version observed across all game slices. */
		lastStateVersion: 0,
		lastPhaseVersion: 0,
		lastPublicStateVersion: 0,
		lastActorStateVersion: 0,
		lastMorningSyncVersion: 0,
		/** Phase-scoped vote tally: voter number -> target number */
		votes: {} as Record<number, number>,
		/** Phase-scoped trial verdicts: voter number -> verdict */
		verdicts: {} as Record<number, Verdict>,
		/** Player number currently on trial, if any */
		onTrialActorNumber: null as number | null,
		/** Dev-only sandbox game loaded from URL/admin controls. */
		isSandbox: false,
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
			if (this.isSandbox) return;

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
		 * - Rejects payloads whose `stateVersion` is older than the applied game state.
		 * - Rejects payloads for a different game than the current one (if set).
		 *
		 * Note: `config` is only set on the first sync since config is
		 * immutable once a game has started.
		 */
		hydrateFromSync(sync: GameSyncResponse) {
			// Stale response — discard
			if (sync.info.stateVersion < this.lastStateVersion) {
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
			this.lastStateVersion = sync.info.stateVersion;
			this.lastPhaseVersion = sync.info.stateVersion;
			this.lastPublicStateVersion = sync.info.stateVersion;
			this.lastActorStateVersion = sync.info.stateVersion;
			if (sync.info.phase === 'morning') this.lastMorningSyncVersion = sync.info.stateVersion;
			this.phaseMeta = {
				phase: sync.info.phase,
				duration: 0,
				label: getPhaseLabel(sync.info.phase, sync.info.pollCount),
				sequence: getPhaseSequence(sync.info.phase, sync.info.pollCount),
				stateVersion: sync.info.stateVersion,
				phaseStartedAt: sync.info.phaseStartedAt,
				phaseEndsAt: sync.info.phaseEndsAt,
			};
			this.status = 'ready';
			this.error = null;
			this.isSandbox = false;

			// Hydrate the phase-scoped vote tally from the authoritative server
			// snapshot (empty outside the poll phase).
			this.votes = sync.votes ?? {};

			// Config is immutable — only set on first hydration
			if (!this.config) {
				this.config = sync.config;
			}
		},

		/** Hydrate local-only dev sandbox state. */
		hydrateSandboxGame(
			sync: GameSyncResponse,
			onTrialActorNumber: number | null,
			verdicts: Record<number, Verdict>,
		) {
			this.info = sync.info;
			this.state = sync.state;
			this.actor = sync.actor;
			this.config = sync.config;
			this.lastStateVersion = sync.info.stateVersion;
			this.lastPhaseVersion = sync.info.stateVersion;
			this.lastPublicStateVersion = sync.info.stateVersion;
			this.lastActorStateVersion = sync.info.stateVersion;
			this.lastMorningSyncVersion =
				sync.info.phase === 'morning' ? sync.info.stateVersion : 0;
			this.phaseMeta = {
				phase: sync.info.phase,
				duration: 0,
				label: getPhaseLabel(sync.info.phase, sync.info.pollCount),
				sequence: getPhaseSequence(sync.info.phase, sync.info.pollCount),
				stateVersion: sync.info.stateVersion,
				phaseStartedAt: sync.info.phaseStartedAt,
				phaseEndsAt: sync.info.phaseEndsAt,
			};
			this.status = 'ready';
			this.error = null;
			this.votes = sync.votes ?? {};
			this.verdicts = verdicts;
			this.onTrialActorNumber = onTrialActorNumber;
			this.isSandbox = true;
		},

		/**
		 * Update phase metadata from a realtime phase change event.
		 */
		applyPhaseEvent(phaseMeta: PhaseMeta) {
			if (phaseMeta.stateVersion <= this.lastPhaseVersion) return false;

			this.phaseMeta = phaseMeta;
			if (this.info) {
				this.info = {
					...this.info,
					phase: phaseMeta.phase,
					pollCount:
						phaseMeta.phase === 'poll' ? phaseMeta.sequence : this.info.pollCount,
					stateVersion: phaseMeta.stateVersion,
					phaseStartedAt: phaseMeta.phaseStartedAt,
					phaseEndsAt: phaseMeta.phaseEndsAt,
				};
			}
			this.lastPhaseVersion = phaseMeta.stateVersion;
			this.lastStateVersion = Math.max(this.lastStateVersion, phaseMeta.stateVersion);
			// Votes and verdicts are phase-scoped; reset on transition.
			this.votes = {};
			this.verdicts = {};
			return true;
		},

		hasPhaseVersionGap(stateVersion: number) {
			return stateVersion > this.lastPhaseVersion + 1;
		},

		syncMorningPhase(stateVersion: number) {
			if (stateVersion <= this.lastMorningSyncVersion) return;
			this.lastMorningSyncVersion = stateVersion;
			void this.syncFromServer();
		},

		/**
		 * Record a player's vote from a realtime vote event.
		 */
		applyVote(voterActorNumber: number, targetActorNumber: number) {
			this.votes = { ...this.votes, [voterActorNumber]: targetActorNumber };
		},

		/**
		 * Remove a player's vote from a realtime vote-cancel event.
		 */
		applyVoteCancel(voterActorNumber: number) {
			const { [voterActorNumber]: _removed, ...rest } = this.votes;
			this.votes = rest;
		},

		/**
		 * Record a player's verdict from a realtime verdict event.
		 */
		applyVerdict(voterActorNumber: number, verdict: Verdict) {
			this.verdicts = { ...this.verdicts, [voterActorNumber]: verdict };
		},

		/**
		 * Mark a player as on trial from a realtime trial event.
		 */
		setOnTrial(actorNumber: number) {
			this.onTrialActorNumber = actorNumber;
			this.verdicts = {};
		},

		/**
		 * Clear the on-trial player from a realtime trial-over event.
		 */
		clearOnTrial() {
			this.onTrialActorNumber = null;
			this.verdicts = {};
		},

		/**
		 * Update public engine state from a realtime state event.
		 */
		applyStateEvent(state: GameState, stateVersion: number) {
			if (stateVersion <= this.lastPublicStateVersion) return;
			this.state = state;
			this.lastPublicStateVersion = stateVersion;
			this.lastStateVersion = Math.max(this.lastStateVersion, stateVersion);
		},

		/** Update this player's private actor state from a realtime delta. */
		applyActorEvent(actorId: string, actor: ActorState, stateVersion: number) {
			if (
				actorId !== this.actor?.id ||
				stateVersion <= this.lastActorStateVersion ||
				stateVersion < this.lastPhaseVersion
			) {
				return;
			}
			this.actor = actor;
			this.lastActorStateVersion = stateVersion;
			this.lastStateVersion = Math.max(this.lastStateVersion, stateVersion);
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
			this.lastStateVersion = 0;
			this.lastPhaseVersion = 0;
			this.lastPublicStateVersion = 0;
			this.lastActorStateVersion = 0;
			this.lastMorningSyncVersion = 0;
			this.votes = {};
			this.verdicts = {};
			this.onTrialActorNumber = null;
			this.isSandbox = false;
		},
	},
});
