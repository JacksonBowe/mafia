export * as Game from './game';
export * from './game';

// Re-export pure contracts for backend convenience.
export type {
	ActorState,
	ClientGameInfo,
	GameConfig,
	GameInfo,
	GamePhase,
	GamePlayer,
	GameSessionInfo,
	GameState,
	GameStatus,
	GameSyncResponse,
	Verdict,
} from './schema';
export {
	ClientGameInfoSchema,
	GameErrors as Errors,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameSessionInfoSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics,
	VerdictSchema,
} from './schema';
