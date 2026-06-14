import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp as pgTimestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core';
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

		// Engine state (serialized GameState from engine)
		engineState: jsonb('engine_state').notNull(),

		// Engine config (serialized GameConfig from engine)
		engineConfig: jsonb('engine_config').notNull(),

		// Actor states per player (serialized ActorState[] from engine)
		actors: jsonb('actors').notNull(),

		// Pending engine event tree produced in evening and replayed during night
		events: jsonb('events'),

		// Step Functions execution ARN for the active game loop
		gameLoopExecutionArn: text('game_loop_execution_arn'),

		// Poll count - tracks voting rounds (max 3 before moving to evening)
		pollCount: integer('poll_count').notNull().default(0),
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

		// Stable in-game actor identity owned by this user for this game
		actorId: text('actor_id').notNull(),

		// Player number assigned by engine (1-15)
		number: integer('player_number').notNull(),

		// Current vote target actor during POLL phase
		voteTargetActorId: text('vote_target_actor_id'),

		// Trial verdict ('guilty' or 'innocent' during TRIAL phase)
		verdict: text('verdict'),

		// Whether this player is currently on trial
		onTrial: boolean('on_trial').notNull().default(false),

		// Current night action target inputs; patched into engine actors by the loop
		targetActorIds: jsonb('target_actor_ids').$type<string[]>().notNull().default([]),
	},
	(t) => [
		index('game_player_game_idx').on(t.gameId),
		index('game_player_user_idx').on(t.userId),
		uniqueIndex('game_player_game_actor_uq').on(t.gameId, t.actorId),
	],
);
