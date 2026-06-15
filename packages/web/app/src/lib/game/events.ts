import { GamePhaseSchema, VerdictSchema, type GameState } from '@mafia/sdk';
import { useQueryClient } from '@tanstack/vue-query';
import type { AppBus } from 'src/boot/bus';
import { useGameStore } from 'src/stores/game';
import { useMessageStore } from 'src/stores/message';
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
		verdict: VerdictSchema,
	}),
	'realtime.game.lynch_result': z.object({
		gameId: ULID,
		actorId: z.string(),
		guiltyCount: z.number().int(),
		abstainCount: z.number().int(),
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
	const messageStore = useMessageStore();
	const off: Array<() => void> = [];

	const system = (gameId: string, text: string) => {
		messageStore.system(text, { scope: 'game', channel: 'GLOBAL', gameId });
	};

	onMounted(() => {
		off.push(
			bus.on('realtime.game.phase', ({ gameId, phase, duration, label, sequence }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.applyPhaseEvent(phase, duration, label, sequence);
				system(gameId, `${label} has begun.`);
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
				system(gameId, `Player ${voterActorNumber} voted Player ${targetActorNumber}.`);
			}),
			bus.on('realtime.game.votecancel', ({ gameId, voterActorNumber }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.applyVoteCancel(voterActorNumber);
				system(gameId, `Player ${voterActorNumber} cancelled their vote.`);
			}),
			bus.on('realtime.game.verdict', ({ gameId, voterActorNumber, verdict }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.applyVerdict(voterActorNumber, verdict);
				system(gameId, `Player ${voterActorNumber} voted ${verdict}.`);
			}),
			bus.on('realtime.game.trial', ({ gameId, actorNumber }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.setOnTrial(actorNumber);
				system(gameId, `Player ${actorNumber} is on trial.`);
			}),
			bus.on('realtime.game.trial_over', ({ gameId }) => {
				if (gameStore.info?.id !== gameId) return;
				gameStore.clearOnTrial();
				system(gameId, 'Trial has ended.');
			}),
			bus.on(
				'realtime.game.lynch_result',
				({ gameId, guiltyCount, innocentCount, abstainCount, isGuilty }) => {
					if (gameStore.info?.id !== gameId) return;
					system(
						gameId,
						`${isGuilty ? 'Guilty' : 'Not guilty'}: ${guiltyCount} guilty, ${innocentCount} innocent, ${abstainCount} abstain.`,
					);
				},
			),
			bus.on('realtime.game.event', ({ gameId, message }) => {
				if (gameStore.info?.id !== gameId) return;
				system(gameId, message);
			}),
			bus.on('realtime.game.deaths', ({ gameId, deaths }) => {
				if (gameStore.info?.id !== gameId) return;
				if (deaths.length === 0) {
					system(gameId, 'No one died.');
					return;
				}
				system(gameId, `${deaths.length} player${deaths.length === 1 ? '' : 's'} died.`);
			}),
			bus.on('realtime.game.over', ({ gameId }) => {
				if (gameStore.info?.id !== gameId) return;
				system(gameId, 'Game over.');
				// Re-sync to get final state
				void gameStore.syncFromServer();
			}),
			bus.on('realtime.game.terminated', ({ gameId, message, error }) => {
				if (gameStore.info?.id === gameId) {
					system(gameId, message ?? error ?? 'Game terminated.');
					gameStore.clearGame();
				}
				void queryClient.invalidateQueries({ queryKey: ['actor', 'presence'] });
			}),
		);
	});

	onUnmounted(() => off.forEach((fn) => fn()));
}
