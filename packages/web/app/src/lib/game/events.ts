import type { SyncEngineState } from '@mafia/core/game/index';
import { useQueryClient } from '@tanstack/vue-query';
import type { AppBus } from 'src/boot/bus';
import { useGameStore } from 'src/stores/game';
import { inject, onMounted, onUnmounted } from 'vue';
import { z } from 'zod';

const ULID = z.string().min(26);

export const GameEventSchemas = {
	'realtime.game.phase': z.object({
		gameId: ULID,
		phase: z.string(),
		duration: z.number().int(),
	}),
	'realtime.game.state': z.object({
		gameId: ULID,
		state: z.unknown(),
	}),
	'realtime.game.over': z.object({
		gameId: ULID,
		winners: z.array(z.unknown()),
	}),
	'realtime.game.terminated': z.object({
		gameId: ULID,
		error: z.string().optional(),
		message: z.string().optional(),
	}),
} as const;

export function useGameEvents() {
	const bus = inject<AppBus>('bus');
	if (!bus) throw new Error('Bus not provided');

	const queryClient = useQueryClient();
	const gameStore = useGameStore();
	const off: Array<() => void> = [];

	onMounted(() => {
		off.push(
			bus.on('realtime.game.phase', ({ gameId, phase, duration }) => {
				if (gameStore.currentGameId !== gameId) return;
				gameStore.applyPhaseEvent(phase, duration);
			}),
			bus.on('realtime.game.state', ({ gameId, state }) => {
				if (gameStore.currentGameId !== gameId) return;
				// Apply state optimistically, then re-sync to get full data (actor etc.)
				if (state && typeof state === 'object') {
					gameStore.applyStateEvent(state as SyncEngineState);
				}
				// Full re-sync to pick up actor updates, player changes, etc.
				void gameStore.syncFromServer();
			}),
			bus.on('realtime.game.over', ({ gameId }) => {
				if (gameStore.currentGameId !== gameId) return;
				// Re-sync to get final state
				void gameStore.syncFromServer();
			}),
			bus.on('realtime.game.terminated', ({ gameId }) => {
				if (gameStore.currentGameId === gameId) {
					gameStore.clearGame();
				}
				void queryClient.invalidateQueries({ queryKey: ['actor', 'presence'] });
			}),
		);
	});

	onUnmounted(() => off.forEach((fn) => fn()));
}
