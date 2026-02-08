import { GameEventGroup } from '../../src/events';
import { EngineLogger } from '../../src/logger';
import type { ActorContext } from '../../src/roles/actor';
import { createRng } from '../../src/utils';
import type { PlayerInput } from '../../src/types';

export const createContext = (seed = 1): ActorContext => ({
	logger: new EngineLogger(),
	actionEvents: new GameEventGroup('action'),
	rng: createRng(seed),
});

export const makePlayer = (overrides: Partial<PlayerInput>): PlayerInput => ({
	id: '1',
	name: 'UserName',
	alias: 'UserAlias',
	alive: true,
	possibleTargets: [],
	targets: [],
	allies: [],
	roleActions: {},
	...overrides,
});
