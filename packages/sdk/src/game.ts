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
		targetActorIds,
	}: SetGameTargetsInput): Promise<{
		gameId: string;
		userId: string;
		targetActorIds: string[];
	}> => request({ method: 'POST', url: `/game/${gameId}/targets`, data: { targetActorIds } }),

	/** Submit or toggle a vote during the POLL phase. */
	submitGameVote: ({
		gameId,
		targetActorId,
	}: SubmitGameVoteInput): Promise<{ voteTargetActorId: string | null }> =>
		request({ method: 'POST', url: `/game/${gameId}/vote`, data: { targetActorId } }),

	/** Cancel the current user's vote. */
	cancelGameVote: ({ gameId }: CancelGameVoteInput): Promise<{ voterActorId: string }> =>
		request({ method: 'POST', url: `/game/${gameId}/vote/cancel` }),

	/** Submit a guilty/innocent verdict during the TRIAL phase. */
	submitGameVerdict: ({
		gameId,
		verdict,
	}: SubmitGameVerdictInput): Promise<{ voterActorId: string; verdict: Verdict }> =>
		request({ method: 'POST', url: `/game/${gameId}/verdict`, data: { verdict } }),
});

export type GameMethods = ReturnType<typeof gameMethods>;
