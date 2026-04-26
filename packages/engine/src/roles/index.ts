import { EngineErrorCodes } from '../constants';
import { EngineError } from '../error';
import type { ActorState } from '../types';
import type { ActorContext } from './actor';
import { Bodyguard } from './bodyguard';
import { Citizen } from './citizen';
import { Doctor } from './doctor';
import { Godfather } from './godfather';
import { Mafioso } from './mafioso';
import { ROLE_NAMES, type RoleName } from './constants';

export {
	ROLE_NAMES,
	GAME_TAGS,
	FALLBACK_ROLE,
	type RoleName,
	type GameTag,
} from './constants';

/** Ordered list of every concrete role class. */
export const ROLE_LIST = [Citizen, Doctor, Bodyguard, Godfather, Mafioso] as const;

export type RoleConstructor = new (
	input: ActorState,
	settings: Record<string, unknown>,
	context: ActorContext,
) => InstanceType<(typeof ROLE_LIST)[number]>;

const buildRoleRecord = <V>(
	pick: (role: (typeof ROLE_LIST)[number]) => V,
): Record<RoleName, V> => {
	const record = {} as Record<RoleName, V>;
	for (const role of ROLE_LIST) {
		record[role.roleName] = pick(role);
	}
	return record;
};

/** Lookup table from role name to role constructor. */
export const ROLE_REGISTRY: Record<RoleName, RoleConstructor> = buildRoleRecord(
	(role) => role satisfies RoleConstructor,
);

/**
 * Action-resolution priority. Lower runs first. Derived from each role's
 * static `priority` field rather than `ROLE_LIST` index, so source ordering
 * cannot accidentally change semantics.
 */
export const ROLE_PRIORITY: Record<RoleName, number> = buildRoleRecord(
	(role) => role.priority,
);

/** Tags advertised by each role. */
export const ROLE_TAGS_MAP: Record<RoleName, readonly string[]> = buildRoleRecord(
	(role) => role.tags,
);

/**
 * Resolve a role name to its constructor. Throws an {@link EngineError} for
 * unknown names rather than a raw `Error` so consumers can match on `code`.
 */
export const importRole = (roleName: string): RoleConstructor => {
	if (!isRoleName(roleName)) {
		throw new EngineError(EngineErrorCodes.UNKNOWN_ROLE, `Unknown role: ${roleName}`, {
			roleName,
		});
	}
	return ROLE_REGISTRY[roleName];
};

export const isRoleName = (value: string): value is RoleName =>
	(ROLE_NAMES as readonly string[]).includes(value);
