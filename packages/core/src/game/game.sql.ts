import { index, jsonb, pgTable, text, timestamp as pgTimestamp } from 'drizzle-orm/pg-core';
import { id, timestamps } from '../db/types';

export const gameTable = pgTable(
	'game',
	{
		...id,
		...timestamps,

		// Game status: 'active', 'completed', 'cancelled'
		status: text('status').notNull().default('active'),

		// Current phase: 'day', 'vote', 'night', 'resolution', etc.
		phase: text('phase').notNull().default('day'),

		// When the game actually started
		startedAt: pgTimestamp('started_at', {
			precision: 3,
			withTimezone: true,
			mode: 'date',
		})
			.notNull()
			.defaultNow(),

		// Engine state (serialized GameStateInput from engine)
		engineState: jsonb('engine_state').notNull(),

		// Engine config (serialized GameConfigInput from engine)
		engineConfig: jsonb('engine_config').notNull(),

		// Actor states per player (serialized ActorState[] from engine)
		actors: jsonb('actors').notNull(),
	},
	(t) => [index('game_status_idx').on(t.status), index('game_created_at_idx').on(t.createdAt)],
);

export const gamePlayerTable = pgTable(
	'game_player',
	{
		...id,
		...timestamps,

		gameId: text('game_id')
			.notNull()
			.references(() => gameTable.id, { onDelete: 'cascade' }),

		userId: text('user_id').notNull(),

		// Player number assigned by engine (1-15)
		number: text('player_number').notNull(),

		// Player alias for this game
		alias: text('alias').notNull(),

		// Player role (assigned by engine)
		role: text('role'),
	},
	(t) => [index('game_player_game_idx').on(t.gameId), index('game_player_user_idx').on(t.userId)],
);
