// ---------------------------------------------------------------------------
// Internal imports (used by the entry-point functions below)
// ---------------------------------------------------------------------------
import type { z } from 'zod';
import { DEFAULT_ALIGNMENT, EngineErrorCodes } from './constants';
import type { EngineContext } from './context';
import { EngineError } from './error';
import { Game } from './game';
import { EngineLogger } from './logger';
import type { ActorState } from './roles/actor';
import {
	EngineInputSchema,
	type EngineInput,
	type EngineResult,
	type GameConfig,
	type GameState,
	type WinnerSummary,
} from './types';
import { createRng } from './utils';

// ---------------------------------------------------------------------------
// Errors & constants
// ---------------------------------------------------------------------------
export {
	BROADCAST_TARGET,
	DeathReasons,
	DEFAULT_ALIGNMENT,
	EngineErrorCodes,
	EventGroupIds,
	EventIds,
	MAX_ACTORS,
	MIN_ACTORS,
} from './constants';
export type { DeathReason, EngineErrorCode, EventId } from './constants';
export { EngineError } from './error';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export { DEFAULT_CONFIG } from './config';

// ---------------------------------------------------------------------------
// Top-level entry points
//
// These three functions are the public surface of the engine. Each takes a raw
// `EngineInput`, validates it once at the boundary (`bootstrap`), runs the
// relevant `Game` lifecycle, then projects the result back out via
// `buildResult`. They differ only in how the `Game` is obtained:
//   newGame     -> fresh game, roles allocated
//   loadGame    -> rebuilt from saved state (no mutation)
//   resolveGame -> rebuilt from saved state, then one night cycle resolved
// ---------------------------------------------------------------------------
export { Game } from './game';

const toValidationError = (error: unknown) =>
	new EngineError(EngineErrorCodes.VALIDATION_ERROR, 'Invalid engine input', error);

// Parse a value against a Zod schema, normalizing failures into EngineErrors.
const parseWith = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> => {
	try {
		return schema.parse(value);
	} catch (err) {
		throw toValidationError(err);
	}
};

// Shape returned to the caller: persistable state, actor dumps, event tree,
// winners (if any), and the captured log output.
const buildResult = (game: Game, winners: WinnerSummary[] | null, logger: EngineLogger) => ({
	state: game.state,
	actors: game.dumpActors(),
	events: game.events.dump(),
	winners,
	log: logger.output,
});

// Project winning actors into the lightweight summaries returned to clients.
const summarizeWinners = (winners: ReturnType<Game['checkForWin']>): WinnerSummary[] | null => {
	if (!winners || winners.length === 0) return null;
	return winners.map((winner) => ({
		id: winner.input.id,
		name: winner.input.name,
		alias: winner.alias,
		number: winner.requireNumber(),
		role: winner.roleName,
		alignment: winner.alignment ?? DEFAULT_ALIGNMENT,
	}));
};

type Bootstrap = {
	parsed: EngineInput;
	context: EngineContext;
	logger: EngineLogger;
	actors: ActorState[];
	config: GameConfig;
};

/**
 * Validate the engine input once at the boundary and derive all per-call
 * resources. Subsequent code consumes already-parsed values, so no further
 * Zod parsing is required.
 */
const bootstrap = (input: EngineInput): Bootstrap => {
	const parsed = parseWith(EngineInputSchema, input);
	const logger = new EngineLogger();
	const rng = createRng(parsed.options?.seed);
	return {
		parsed,
		context: { logger, rng },
		logger,
		actors: parsed.actors,
		config: parsed.config,
	};
};

// load/resolve require a prior GameState; fail loudly if it's missing.
const requireState = (input: EngineInput, action: 'load' | 'resolve'): GameState => {
	if (!input.state) {
		throw new EngineError(
			EngineErrorCodes.MISSING_STATE,
			`State is required to ${action} a game`,
		);
	}
	return input.state;
};

// Create a brand-new game, allocate roles, then report any immediate winners.
export const newGame = (input: EngineInput): EngineResult => {
	const { context, logger, actors, config } = bootstrap(input);
	const game = Game.new(actors, config, context);
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

// Rebuild a game from saved state (no progression) and check win conditions.
export const loadGame = (input: EngineInput): EngineResult => {
	const { parsed, context, logger, actors, config } = bootstrap(input);
	const state = requireState(parsed, 'load');
	const game = Game.load(actors, config, state, context);
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

// Rebuild from saved state, lynch one actor, then check win conditions.
export const lynchGame = (input: EngineInput & { actorNumber: number }): EngineResult => {
	const { parsed, context, logger, actors, config } = bootstrap(input);
	const state = requireState(parsed, 'load');
	const game = Game.load(actors, config, state, context);
	game.lynch(input.actorNumber);
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

// Rebuild from saved state, resolve one night cycle, then check win conditions.
export const resolveGame = (input: EngineInput): EngineResult => {
	const { parsed, context, logger, actors, config } = bootstrap(input);
	const state = requireState(parsed, 'resolve');
	const game = Game.load(actors, config, state, context);
	game.resolve();
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};

// ---------------------------------------------------------------------------
// Events & logging
// ---------------------------------------------------------------------------
export {
	CommonEvents,
	Duration,
	GameEvent,
	GameEventDumpSchema,
	GameEventGroup,
	GameEventGroupDumpSchema,
} from './events';
export type { GameEventDump, GameEventEntry, GameEventGroupDump, GameEventTargets } from './events';
export { EngineLogger } from './logger';

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export {
	FALLBACK_ROLE,
	getRoleAttributes,
	instantiateRole,
	ROLE_INFO,
	ROLE_KEYS,
	ROLE_NAME_BY_KEY,
	RoleAlignmentSchema,
	RoleKeySchema,
	RoleNamesAndPriorityOrder,
	RoleTags,
	RoleTagSchema,
} from './roles';
export type { RoleAlignment, RoleKey, RoleName, RoleSettings, RoleTag, TagLike } from './roles';

export { Actor, Mafia, Town } from './roles/actor';
export { Bodyguard, BodyguardSettingsSchema } from './roles/bodyguard';
export type { BodyguardSettings } from './roles/bodyguard';
export { Citizen, CitizenSettingsSchema } from './roles/citizen';
export type { CitizenSettings } from './roles/citizen';
export { Doctor, DoctorSettingsSchema } from './roles/doctor';
export type { DoctorSettings } from './roles/doctor';
export { Godfather, GodfatherSettingsSchema } from './roles/godfather';
export type { GodfatherSettings } from './roles/godfather';
export { Mafioso, MafiosoSettingsSchema } from './roles/mafioso';
export type { MafiosoSettings } from './roles/mafioso';
export { Survivor, SurvivorSettingsSchema } from './roles/survivor';
export type { SurvivorSettings } from './roles/survivor';

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------
export type { ActorContext, EngineContext } from './context';

// ---------------------------------------------------------------------------
// RNG utilities
// ---------------------------------------------------------------------------
export { createRng, toSnakeCase } from './utils';
export type { Rng } from './utils';

// ---------------------------------------------------------------------------
// Schemas & types
// ---------------------------------------------------------------------------
export {
	EngineInputSchema,
	EngineOptionsSchema,
	GameConfigSchema,
	GameStateSchema,
	StateActorSchema,
	StateGraveyardRecordSchema,
	WinnerSummarySchema,
} from './types';
export type {
	EngineInput,
	EngineOptions,
	EngineResult,
	GameConfig,
	GameState,
	StateActor,
	StateGraveyardRecord,
	WinnerSummary,
} from './types';

export { ActorStateSchema } from './roles/actor';
export type { ActorState } from './roles/actor';
