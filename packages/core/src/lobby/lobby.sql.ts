import { index, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { id, timestamps } from '../db/types';
import { userTable } from '../user/user.sql';

export const lobbyTable = pgTable(
	'lobby',
	{
		...id,
		...timestamps,

		hostId: text('host_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),

		name: text('name').notNull(),
		config: jsonb('config').notNull(),
	},
	(t) => [
		// Helpful for "my hosted lobby"
		index('lobby_host_idx').on(t.hostId),

		// Rule: globally unique lobby names
		uniqueIndex('lobby_name_uq').on(t.name),

		// Rule: a user cannot host multiple lobbies
		uniqueIndex('lobby_host_uq').on(t.hostId),
	],
);

export const lobbyMemberTable = pgTable(
	'lobby_member',
	{
		...id,
		...timestamps,

		lobbyId: text('lobby_id')
			.notNull()
			.references(() => lobbyTable.id, { onDelete: 'cascade' }),

		userId: text('user_id')
			.notNull()
			.references(() => userTable.id, { onDelete: 'restrict' }),
	},
	(t) => [
		index('lobby_member_lobby_idx').on(t.lobbyId),
		index('lobby_member_user_idx').on(t.userId),

		// Rule: user cannot be in the same lobby multiple times
		uniqueIndex('lobby_member_lobby_user_uq').on(t.lobbyId, t.userId),

		// Rule: user cannot be in two lobbies at once
		uniqueIndex('lobby_member_user_uq').on(t.userId),
	],
);
