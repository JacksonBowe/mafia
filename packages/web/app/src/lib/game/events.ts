import { GamePhaseSchema, type GameState } from '@mafia/sdk';
import { useQueryClient } from '@tanstack/vue-query';
import type { AppBus } from 'src/boot/bus';
import { useGameStore } from 'src/stores/game';
import { inject, onMounted, onUnmounted } from 'vue';
import { z } from 'zod';

const ULID = z.string().min(26);

export const GameEventSchemas = {
	'realtime.game.phase': z.object({
		gameId: ULID,
		phase: GamePhaseSchema,
		duration: z.number().int(),
		label: z.string(),
		sequence: z.number().int(),
	}),
	'realtime.game.state': z.object({
		gameId: ULID,
		state: z.unknown(),
	}),
	'realtime.game.vote': z.object({
		gameId: ULID,
		voterActorNumber: z.number().int(),
		targetActorNumber: z.number().int(),
	}),
	'realtime.game.votecancel': z.object({
		gameId: ULID,
		voterActorNumber: z.number().int(),
	}),
	'realtime.game.trial': z.object({
		gameId: ULID,
		actorNumber: z.number().int(),
	}),
	'realtime.game.trial_over': z.object({
		gameId: ULID,
	}),
	'realtime.game.verdict': z.object({
		gameId: ULID,
		voterActorNumber: z.number().int(),
		verdict: z.enum(['guilty', 'innocent']),
	}),
	'realtime.game.lynch_result': z.object({
		gameId: ULID,
		actorId: z.string(),
		guiltyCount: z.number().int(),
		innocentCount: z.number().int(),
		isGuilty: z.boolean(),
	}),
	'realtime.game.actor': z.object({
		gameId: ULID,
		actorId: z.string(),
		actor: z.unknown(),
	}),
	'realtime.game.event': z.object({
		gameId: ULID,
		actorId: z.string(),
		eventId: z.string(),
		message: z.string(),
		duration: z.number().int().default(0),
	}),
	'realtime.game.role_reveal': z.object({
		gameId: ULID,
		actorId: z.string(),
		role: z.string(),
		allies: z.array(
			z.object({
				playerNumber: z.number().int(),
				alias: z.string(),
				role: z.string().optional(),
			}),
		),
	}),
	'realtime.game.targets': z.object({
		gameId: ULID,
		actorId: z.string(),
		possibleTargets: z.array(z.array(z.number().int())),
	}),
	'realtime.game.deaths': z.object({
		gameId: ULID,
		deaths: z.array(z.unknown()),
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
			bus.on('realtime.game.phase', ({ gameId, phase, duration, label, sequence }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.applyPhaseEvent(phase, duration, label, sequence);
			}),
			bus.on('realtime.game.state', ({ gameId, state }) => {
				if (gameStore.info?.id !== gameId) return;
				// Apply state optimistically, then re-sync to get full data (actor etc.)
				if (state && typeof state === 'object') {
					gameStore.applyStateEvent(state as GameState);
				}
				// Full re-sync to pick up actor updates, player changes, etc.
				void gameStore.syncFromServer();
			}),
			bus.on('realtime.game.vote', ({ gameId, voterActorNumber, targetActorNumber }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.applyVote(voterActorNumber, targetActorNumber);
			}),
			bus.on('realtime.game.votecancel', ({ gameId, voterActorNumber }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.applyVoteCancel(voterActorNumber);
			}),
			bus.on('realtime.game.verdict', ({ gameId, voterActorNumber, verdict }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.applyVerdict(voterActorNumber, verdict);
			}),
			bus.on('realtime.game.trial', ({ gameId, actorNumber }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.setOnTrial(actorNumber);
			}),
			bus.on('realtime.game.trial_over', ({ gameId }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.clearOnTrial();
			}),
			bus.on('realtime.game.over', ({ gameId }) => {
				if (gameStore.info?.id !== gameId) return;
				// Re-sync to get final state
				void gameStore.syncFromServer();
			}),
			bus.on('realtime.game.terminated', ({ gameId }) => {
				if (gameStore.info?.id === gameId) {
					gameStore.clearGame();
				}
				void queryClient.invalidateQueries({ queryKey: ['actor', 'presence'] });
			}),
		);
	});

	onUnmounted(() => off.forEach((fn) => fn()));
}
