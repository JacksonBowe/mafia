import { char, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { isULID } from '../error';

// ULID field for Postgres (same length as before)
export const ulid = (name: string) => char(name, { length: 26 });

// ID helper with primary key
export const id = {
    get id() {
        return ulid('id').primaryKey(); // Primary key using ULID
    },
};

export const idSchema = z.string()

// Timestamp field for Postgres
export const timestamp = (name: string) =>
    pgTimestamp(name, {
        precision: 3, // Postgres uses 'precision' instead of 'fsp'
        withTimezone: true,
        mode: 'date', // Optional: Mode setting if needed
    });

// Common timestamps: created, updated, and deleted
export const timestamps = {
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .$onUpdate(() => new Date()),
};

export const timestampsSchema = z.object({
    createdAt: z.date(), // Created timestamp
    updatedAt: z.date().optional(), // Optional updated timestamp
})

export const RelatedEntitySchema = z.object({
    id: isULID(),
    name: z.string(),
});

export const EntityBaseSchema = z.object({
    id: isULID(), // ULID as a string
    createdAt: z.date(), // Created timestamp
    updatedAt: z.date().optional(), // Optional updated timestamp
});

export type RelatedEntity = z.infer<typeof RelatedEntitySchema>;

// Postgres unique violation code
const PG_UNIQUE_VIOLATION = '23505'

export type PgLikeError = {
    code?: string
    constraint?: string
    detail?: string
    message?: string
    cause?: unknown
}

export function unwrapCause(e: unknown): unknown {
    let cur: unknown = e
    for (let i = 0; i < 5; i++) {
        const c = (cur as any)?.cause
        if (!c) break
        cur = c
    }
    return cur
}

export function getPgError(e: unknown): PgLikeError | null {
    const cur = unwrapCause(e)
    if (cur && typeof cur === 'object') return cur as PgLikeError
    return null
}

export function isUniqueViolation(e: unknown): boolean {
    const pg = getPgError(e)
    return pg?.code === PG_UNIQUE_VIOLATION
}

export function getConstraintName(e: unknown): string | undefined {
    const pg = getPgError(e)
    // best case: driver provides constraint explicitly
    if (pg?.constraint) return pg.constraint

    // fallback: sometimes only message has it
    const msg = pg?.message ?? ''
    // e.g. 'duplicate key value violates unique constraint "lobby_name_uq"'
    const m = msg.match(/unique constraint "([^"]+)"/i)
    return m?.[1]
}

export type Page<T> = {
    items: T[];
    meta: {
        limit: number;
        hasMore: boolean;
        nextCursor: string | null;
    };
};