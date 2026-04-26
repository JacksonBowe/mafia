// ---------------------------------------------------------------------------
// Pure DB-related Zod schemas / types shared with the SDK.
// Must NOT import any infra (sst, hono, drizzle, aws, neondatabase, ws).
// ---------------------------------------------------------------------------
import { z } from 'zod';
import { isULID } from '../error/schema';

export const idSchema = z.string();

export const timestampsSchema = z.object({
	createdAt: z.date(),
	updatedAt: z.date().optional(),
});

export const RelatedEntitySchema = z.object({
	id: isULID(),
	name: z.string(),
});

export const EntityBaseSchema = z.object({
	id: isULID(),
	createdAt: z.date(),
	updatedAt: z.date().optional(),
});

export type RelatedEntity = z.infer<typeof RelatedEntitySchema>;
export type EntityBase = z.infer<typeof EntityBaseSchema>;

export type Page<T> = {
	items: T[];
	meta: {
		limit: number;
		hasMore: boolean;
		nextCursor: string | null;
	};
};
