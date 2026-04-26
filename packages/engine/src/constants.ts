/**
 * Engine-wide numeric, string, and identifier constants.
 *
 * Centralised so schemas, defaults, role implementations, and consumers stay
 * in sync. No imports from other engine modules — pure values only.
 */

// ---------------------------------------------------------------------------
// Game sizing
// ---------------------------------------------------------------------------

/** Minimum number of actors permitted in a game. */
export const MIN_ACTORS = 1;

/** Maximum number of actors permitted in a game. Mirrored by Zod schemas. */
export const MAX_ACTORS = 15;

// ---------------------------------------------------------------------------
// Role defaults
// ---------------------------------------------------------------------------

/** Default Citizen vest count. */
export const DEFAULT_VESTS = 2;

/** Default Godfather night-immunity setting. */
export const DEFAULT_NIGHT_IMMUNE = 2;

/** Alignment used when an actor's alignment is missing or unknown. */
export const DEFAULT_ALIGNMENT = 'Town' as const;

// ---------------------------------------------------------------------------
// Event targeting
// ---------------------------------------------------------------------------

/**
 * Target sentinel for events broadcast to all actors (rather than addressed
 * to a specific actor id).
 */
export const BROADCAST_TARGET = '*' as const;

// ---------------------------------------------------------------------------
// Stable engine error codes
// ---------------------------------------------------------------------------

/** Stable, dot.snake_case codes consumed by API clients. Do not rename. */
export const EngineErrorCodes = {
	VALIDATION_ERROR: 'engine.validation_error',
	MISSING_ROLE: 'engine.missing_role',
	MISSING_STATE: 'engine.missing_state',
	MISSING_NUMBER: 'engine.missing_number',
	ACTOR_NOT_FOUND: 'engine.actor_not_found',
	NO_ROLE_OPTIONS: 'engine.no_role_options',
	ROLE_PICK_FAILED: 'engine.role_pick_failed',
	ACTION_NOT_IMPLEMENTED: 'engine.action_not_implemented',
	UNKNOWN_ROLE: 'engine.unknown_role',
	RNG_EMPTY_LIST: 'engine.rng_empty_list',
	RNG_WEIGHT_MISMATCH: 'engine.rng_weight_mismatch',
} as const;

export type EngineErrorCode = (typeof EngineErrorCodes)[keyof typeof EngineErrorCodes];

// ---------------------------------------------------------------------------
// Stable engine event ids
// ---------------------------------------------------------------------------

/** Centralised event-id catalogue. Stable strings; consumers may match on these. */
export const EventIds = {
	NIGHT_IMMUNE: 'night_immune',
	KILLED_BY_MAFIA: 'killed_by_mafia',

	GODFATHER_ACTION_SUCCESS: 'godfather_action_success',
	GODFATHER_ACTION_FAIL: 'godfather_action_fail',
	GODFATHER_KILL_SUCCESS: 'godfather_kill_success',
	GODFATHER_KILL_FAIL: 'godfather_kill_fail',
	GODFATHER_PROXY: 'godfather_proxy',
	GODFATHER_PROXY_CHOICE: 'godfather_proxy_choice',

	MAFIOSO_ACTION_SUCCESS: 'mafioso_action_success',
	MAFIOSO_ACTION_FAIL: 'mafioso_action_fail',
	MAFIOSO_KILL_SUCCESS: 'mafioso_kill_success',
	MAFIOSO_KILL_FAIL: 'mafioso_kill_fail',

	BODYGUARD_SHOOTOUT: 'bodyguard_shootout',
	BODYGUARD_PROTECTED_TARGET: 'bodyguard_protected_target',
	BODYGUARD_KILLED_ATTACKER: 'bodyguard_killed_attacker',
	BODYGUARD_DIED_DEFENDING: 'bodyguard_died_defending',

	DOCTOR_REVIVE: 'doctor_revive',
	DOCTOR_REVIVE_SUCCESS: 'doctor_revive_success',
	REVIVE_BY_DOCTOR: 'revive_by_doctor',
} as const;

export type EventId = (typeof EventIds)[keyof typeof EventIds];

// ---------------------------------------------------------------------------
// Stable death reasons
// ---------------------------------------------------------------------------

/** Death-reason text exposed on `Actor.cod`. */
export const DeathReasons = {
	UNKNOWN: 'Unknown',
	UNKNOWN_LONG: 'How they died is unknown',
	LYNCHED: 'They were lynched',
	MAFIA_KILL: 'They were found riddled with bullets',
	SHOOTOUT: 'Died in a shootout',
} as const;

export type DeathReason = (typeof DeathReasons)[keyof typeof DeathReasons];

// ---------------------------------------------------------------------------
// Event group ids
// ---------------------------------------------------------------------------

export const EventGroupIds = {
	ROOT: 'root',
	ACTION: 'action',
} as const;
