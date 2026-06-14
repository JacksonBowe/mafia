import type {
	CancelGameVoteInput,
	SetGameTargetsInput,
	SubmitGameVerdictInput,
	SubmitGameVoteInput,
} from '@mafia/sdk';
import { useMutation } from '@tanstack/vue-query';
import { api } from 'src/boot/axios';
import { useGameStore } from 'src/stores/game';

// Game actions are fire-and-forget: the server broadcasts a realtime event
// (vote / votecancel / verdict / trial) that updates the store for everyone,
// including the acting player. No post-action sync is needed.

export const useSetGameTargets = () => {
	const gameStore = useGameStore();

	return useMutation({
		mutationFn: (input: SetGameTargetsInput) => {
			if (gameStore.isSandbox) {
				if (gameStore.actor) {
					gameStore.actor = { ...gameStore.actor, targets: input.targetActorNumbers };
				}
				return Promise.resolve({ gameId: input.gameId, targetActorNumbers: input.targetActorNumbers });
			}
			return api.setGameTargets(input);
		},
		onError: (e) => {
			console.error('Set Targets Error', e);
		},
	});
};

export const useSubmitGameVote = () => {
	const gameStore = useGameStore();

	return useMutation({
		mutationFn: (input: SubmitGameVoteInput) => {
			const actorNumber = gameStore.actor?.number;
			if (gameStore.isSandbox && actorNumber) {
				if (gameStore.votes[actorNumber] === input.targetActorNumber) {
					gameStore.applyVoteCancel(actorNumber);
					return Promise.resolve({ voteTargetActorNumber: null });
				}
				gameStore.applyVote(actorNumber, input.targetActorNumber);
				return Promise.resolve({ voteTargetActorNumber: input.targetActorNumber });
			}
			return api.submitGameVote(input);
		},
		onError: (e) => {
			console.error('Submit Vote Error', e);
		},
	});
};

export const useCancelGameVote = () => {
	const gameStore = useGameStore();

	return useMutation({
		mutationFn: (input: CancelGameVoteInput) => {
			const actorNumber = gameStore.actor?.number;
			if (gameStore.isSandbox && actorNumber) {
				gameStore.applyVoteCancel(actorNumber);
				return Promise.resolve({ success: true });
			}
			return api.cancelGameVote(input);
		},
		onError: (e) => {
			console.error('Cancel Vote Error', e);
		},
	});
};

export const useSubmitGameVerdict = () => {
	const gameStore = useGameStore();

	return useMutation({
		mutationFn: (input: SubmitGameVerdictInput) => {
			const actorNumber = gameStore.actor?.number;
			if (gameStore.isSandbox && actorNumber) {
				gameStore.applyVerdict(actorNumber, input.verdict);
				return Promise.resolve({ verdict: input.verdict });
			}
			return api.submitGameVerdict(input);
		},
		onError: (e) => {
			console.error('Submit Verdict Error', e);
		},
	});
};
