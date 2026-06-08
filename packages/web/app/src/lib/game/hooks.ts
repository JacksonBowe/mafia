import type {
	CancelGameVoteInput,
	SetGameTargetsInput,
	SubmitGameVerdictInput,
	SubmitGameVoteInput,
} from '@mafia/sdk';
import { useMutation } from '@tanstack/vue-query';
import { api } from 'src/boot/axios';

// Game actions are fire-and-forget: the server broadcasts a realtime event
// (vote / votecancel / verdict / trial) that updates the store for everyone,
// including the acting player. No post-action sync is needed.

export const useSetGameTargets = () => {
	return useMutation({
		mutationFn: (input: SetGameTargetsInput) => api.setGameTargets(input),
		onError: (e) => {
			console.error('Set Targets Error', e);
		},
	});
};

export const useSubmitGameVote = () => {
	return useMutation({
		mutationFn: (input: SubmitGameVoteInput) => api.submitGameVote(input),
		onError: (e) => {
			console.error('Submit Vote Error', e);
		},
	});
};

export const useCancelGameVote = () => {
	return useMutation({
		mutationFn: (input: CancelGameVoteInput) => api.cancelGameVote(input),
		onError: (e) => {
			console.error('Cancel Vote Error', e);
		},
	});
};

export const useSubmitGameVerdict = () => {
	return useMutation({
		mutationFn: (input: SubmitGameVerdictInput) => api.submitGameVerdict(input),
		onError: (e) => {
			console.error('Submit Verdict Error', e);
		},
	});
};
