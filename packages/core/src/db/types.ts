// ---------------------------------------------------------------------------
// Drizzle column helpers + Postgres error utilities (server-only).
// Pure schemas live in ./schema and are re-exported here for convenience.
// ---------------------------------------------------------------------------
import { char, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';


// ULID column for Postgres
export const ulid = (name: string) => char(name, { length: 26 });

// ID helper with primary key
export const id = {
	get id() {
		return ulid('id').primaryKey();
	},
};

// Timestamp column for Postgres
export const timestamp = (name: string) =>
	pgTimestamp(name, {
		precision: 3,
		withTimezone: true,
		mode: 'date',
	});

// Common timestamps: created, updated
export const timestamps = {
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Postgres error helpers
// ---------------------------------------------------------------------------

const PG_UNIQUE_VIOLATION = '23505';

export type PgLikeError = {
	code?: string;
	constraint?: string;
	detail?: string;
	message?: string;
	cause?: unknown;
};

export function unwrapCause(e: unknown): unknown {
	let cur: unknown = e;
	for (let i = 0; i < 5; i++) {
		const c = (cur as { cause?: unknown })?.cause;
		if (!c) break;
		cur = c;
	}
	return cur;
}

export function getPgError(e: unknown): PgLikeError | null {
	const cur = unwrapCause(e);
	if (cur && typeof cur === 'object') return cur as PgLikeError;
	return null;
}

export function isUniqueViolation(e: unknown): boolean {
	const pg = getPgError(e);
	return pg?.code === PG_UNIQUE_VIOLATION;
}

export function getConstraintName(e: unknown): string | undefined {
	const pg = getPgError(e);
	if (pg?.constraint) return pg.constraint;
	const msg = pg?.message ?? '';
	const m = msg.match(/unique constraint "([^"]+)"/i);
	return m?.[1];
}
