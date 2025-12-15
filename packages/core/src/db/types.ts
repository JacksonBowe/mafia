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

export function isUniqueConstraintError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    // PostgreSQL unique_violation error code
    return (err as any).code === '23505';
}

export type Page<T> = {
    items: T[];
    meta: {
        limit: number;
        hasMore: boolean;
        nextCursor: string | null;
    };
};