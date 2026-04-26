import type { GameEventGroup } from './events';
import type { EngineLogger } from './logger';
import type { Rng } from './utils';

export type EngineContext = {
	logger: EngineLogger;
	rng: Rng;
};

export type ActorContext = EngineContext & {
	actionEvents: GameEventGroup;
};
