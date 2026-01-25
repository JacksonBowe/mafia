import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';
import { EntityBaseSchema } from '../db/types';
import { useTransaction } from '../db/transaction';
import { InputError, isULID } from '../error';
import { fn } from '../util/fn';
import { gamePlayerTable, gameTable } from './game.sql';

export * as Game from './';

// ---------------------
// Error codes
// ---------------------

export enum Errors {
	GameNotFound = 'game.not_found',
	GameInvalidState = 'game.invalid_state',
}

// ---------------------
// Schemas
// ---------------------

export const GameStatusSchema = z.enum(['active', 'completed', 'cancelled']);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const GamePhaseSchema = z.enum(['day', 'vote', 'night', 'resolution']);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

export const GamePlayerSchema = z.object({
	id: isULID(),
	gameId: isULID(),
	userId: z.string(),
	number: z.string(),
	alias: z.string(),
	role: z.string().nullable(),
});

export type GamePlayer = z.infer<typeof GamePlayerSchema>;

export const GameInfoSchema = EntityBaseSchema.extend({
	status: GameStatusSchema,
	phase: GamePhaseSchema,
	startedAt: z.date(),
	engineState: z.unknown(),
	engineConfig: z.unknown(),
	actors: z.unknown(),
	players: z.array(GamePlayerSchema),
});

export type GameInfo = z.infer<typeof GameInfoSchema>;

// ---------------------
// Input schemas
// ---------------------

export const CreateGameInputSchema = z.object({
	engineState: z.unknown(),
	engineConfig: z.unknown(),
	actors: z.unknown(),
	players: z.array(
		z.object({
			userId: z.string(),
			number: z.string(),
			alias: z.string(),
			role: z.string().nullable(),
		}),
	),
});

export type CreateGameInput = z.infer<typeof CreateGameInputSchema>;

// ---------------------
// Core functions
// ---------------------

export const create = fn(CreateGameInputSchema, async (input) =>
	useTransaction(async (tx) => {
		const gameId = ulid();

		// Insert game record
		await tx.insert(gameTable).values({
			id: gameId,
			status: 'active',
			phase: 'day',
			engineState: input.engineState,
			engineConfig: input.engineConfig,
			actors: input.actors,
		});

		// Insert game players
		if (input.players.length > 0) {
			await tx.insert(gamePlayerTable).values(
				input.players.map((p) => ({
					id: ulid(),
					gameId,
					userId: p.userId,
					number: p.number,
					alias: p.alias,
					role: p.role,
				})),
			);
		}

		return { gameId };
	}),
);

export const get = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		useTransaction(async (tx) => {
			const [game] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

			if (!game) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			const players = await tx
				.select()
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			return GameInfoSchema.parse({
				...game,
				players,
			});
		}),
);

export const updateState = fn(
	z.object({
		gameId: isULID(),
		engineState: z.unknown(),
		actors: z.unknown(),
		phase: GamePhaseSchema.optional(),
		status: GameStatusSchema.optional(),
	}),
	async ({ gameId, engineState, actors, phase, status }) =>
		useTransaction(async (tx) => {
			const updates: Record<string, unknown> = {
				engineState,
				actors,
			};

			if (phase) updates.phase = phase;
			if (status) updates.status = status;

			const [updated] = await tx
				.update(gameTable)
				.set(updates)
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (!updated) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);

export const list = () =>
	useTransaction(async (tx) =>
		tx
			.select({
				id: gameTable.id,
				status: gameTable.status,
				createdAt: gameTable.createdAt,
			})
			.from(gameTable),
	);

export const getByPlayer = fn(
	z.object({
		userId: z.string(),
	}),
	async ({ userId }) =>
		useTransaction(async (tx) => {
			// Find the player's active game
			const [playerGame] = await tx
				.select({
					gameId: gamePlayerTable.gameId,
				})
				.from(gamePlayerTable)
				.innerJoin(gameTable, eq(gameTable.id, gamePlayerTable.gameId))
				.where(eq(gamePlayerTable.userId, userId))
				.limit(1);

			if (!playerGame) {
				return null;
			}

			return get({ gameId: playerGame.gameId });
		}),
);

export const terminate = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		useTransaction(async (tx) => {
			const [game] = await tx
				.select({ id: gameTable.id })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);

			if (!game) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			const deleted = await tx
				.delete(gameTable)
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			if (deleted.length === 0) {
				throw new InputError(Errors.GameNotFound, 'Game not found');
			}

			return { gameId };
		}),
);
