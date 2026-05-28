// ---------------------------------------------------------------------------
// Pure user contracts shared with the SDK.
// Must NOT import any infra (sst, hono, drizzle, aws, neondatabase, ws).
// ---------------------------------------------------------------------------
import { z } from 'zod';
import { EntityBaseSchema, RelatedEntitySchema } from '../db/schema';
import { isULID } from '../error/schema';

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export enum UserErrors {
	UserExists = 'user.exists',
	UserNotFound = 'user.not_found',
}

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

export const UserInfoSchema = EntityBaseSchema.extend({
	discordId: z.string(),
	name: z.string(),
	profileImageUrl: z.string().url().optional(),
	avatar: z.string().optional().nullable(),
	isAdmin: z.boolean().default(false),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

export const PresenceSchema = z.object({
	lobby: RelatedEntitySchema.nullable().optional(),
	gameId: isULID().nullable(),
});

export type Presence = z.infer<typeof PresenceSchema>;
