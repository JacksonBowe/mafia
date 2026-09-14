export * from './game';
export * as Game from './game';

// Re-export pure contracts for backend convenience.
export {
	ClientGameInfoSchema,
	GameErrors as Errors,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics,
	VerdictSchema
} from './schema';
export type {
	ActorState,
	ClientGameInfo,
	GameConfig,
	GameInfo,
	GamePhase,
	GamePlayer,
	GameState,
	GameStatus,
	GameSyncResponse,
	Verdict
} from './schema';
