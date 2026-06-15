import { boolean, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { id, timestamp, timestamps } from '../db/types';

export const userTable = pgTable('user', {
	...id,
	...timestamps,

	discordId: text('discord_id').notNull().unique(),
	isBot: boolean('is_bot').notNull().default(false),
	isAdmin: boolean('is_admin').notNull().default(false),
	// Optional profile details
	name: text('name').notNull(),
	// profileImageUrl: text('profile_image_url'),

	lastLoginAt: timestamp('last_login_at'),
	enabled: boolean('enabled').notNull().default(true),
});

export const userApiKeyTable = pgTable(
	'user_api_key',
	{
		...id,
		...timestamps,

		userId: text('user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'cascade' }),

		// SHA-256 hex digest of the raw key. The raw key is never stored.
		keyHash: text('key_hash').notNull(),

		// Human-friendly label, e.g. "Bot 01".
		name: text('name').notNull(),

		enabled: boolean('enabled').notNull().default(true),

		lastUsedAt: timestamp('last_used_at'),
	},
	(t) => [
		index('user_api_key_user_idx').on(t.userId),
		uniqueIndex('user_api_key_hash_uq').on(t.keyHash),
	],
);
