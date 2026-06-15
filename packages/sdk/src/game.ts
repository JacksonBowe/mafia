import type { GameSyncResponse, Verdict } from '@mafia/core/game/schema';
import type { AxiosRequestConfig } from 'axios';
import type {
	SetTargetsJson,
	SubmitVerdictJson,
	SubmitVoteJson,
} from '@mafia/functions/api/schemas/game.schemas';

export type RequestFn = <T>(config: AxiosRequestConfig) => Promise<T>;

// ---------------------------------------------------------------------------
// Input types (re-exported from schemas for SDK consumers)
//
// Targets/votes reference other players by their public number (1-15); the API
// resolves these to private actor ids server-side.
// ---------------------------------------------------------------------------

export type SetGameTargetsInput = { gameId: string } & SetTargetsJson;
export type SubmitGameVoteInput = { gameId: string } & SubmitVoteJson;
export type CancelGameVoteInput = { gameId: string };
export type SubmitGameVerdictInput = { gameId: string } & SubmitVerdictJson;

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export const gameMethods = (request: RequestFn) => ({
	/** Fetch the current user's active game sync data (or null if none). */
	getGame: (): Promise<GameSyncResponse | null> => request({ method: 'GET', url: '/game' }),

	/** Set night action targets for the current user. */
	setGameTargets: ({
		gameId,
		targetActorNumbers,
	}: SetGameTargetsInput): Promise<{ gameId: string; targetActorNumbers: number[] }> =>
		request({ method: 'POST', url: `/game/${gameId}/targets`, data: { targetActorNumbers } }),

	/** Submit or toggle a vote during the POLL phase. */
	submitGameVote: ({
		gameId,
		targetActorNumber,
	}: SubmitGameVoteInput): Promise<{ voteTargetActorNumber: number | null }> =>
		request({ method: 'POST', url: `/game/${gameId}/vote`, data: { targetActorNumber } }),

	/** Cancel the current user's vote. */
	cancelGameVote: ({ gameId }: CancelGameVoteInput): Promise<{ success: boolean }> =>
		request({ method: 'POST', url: `/game/${gameId}/vote/cancel` }),

	/** Submit a guilty/innocent/abstain verdict during the TRIAL phase. */
	submitGameVerdict: ({
		gameId,
		verdict,
	}: SubmitGameVerdictInput): Promise<{ verdict: Verdict }> =>
		request({ method: 'POST', url: `/game/${gameId}/verdict`, data: { verdict } }),
});

export type GameMethods = ReturnType<typeof gameMethods>;
