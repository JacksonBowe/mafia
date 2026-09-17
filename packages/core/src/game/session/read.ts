import { ActorStateSchema, GameConfigSchema, GameStateSchema, type ActorState, type GameConfig, type GameState } from '@mafia/engine';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { useTransaction } from '../../db/transaction';
import { isULID } from '../../error';
import { fn } from '../../util/fn';
import { gamePlayerTable, gameTable } from '../game.sql';
import * as Assert from './assert';
import { ClientGameInfoSchema, GameSessionInfoSchema, type GameSyncResponse } from './schema';

/** Reads all persisted player rows for a game in the current transaction. */
export const getPlayers = (gameId: string) =>
	useTransaction((tx) =>
		tx.select().from(gamePlayerTable).where(eq(gamePlayerTable.gameId, gameId)),
	);

export const get = fn(
	z.object({
		gameId: isULID(),
	}),
	async ({ gameId }) =>
		useTransaction(async (tx) => {
			const [game] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

			Assert.gameFound(game);
			const players = await getPlayers(gameId);

			return GameSessionInfoSchema.parse({ ...game, players });
		}),
);

/**
 * Returns the active game's player-specific sync projection, or `null` when
 * the user has no active game. Completed and cancelled games never sync.
 */
export const sync = fn(z.object({ userId: z.string() }), async ({ userId }) =>
	useTransaction(async (tx) => {
		// Find the player's active game
		const [playerRow] = await tx
			.select({
				gameId: gamePlayerTable.gameId,
				actorId: gamePlayerTable.actorId,
			})
			.from(gamePlayerTable)
			.innerJoin(gameTable, eq(gameTable.id, gamePlayerTable.gameId))
			.where(and(eq(gamePlayerTable.userId, userId), eq(gameTable.status, 'active')))
			.limit(1);

		if (!playerRow) {
			return null;
		}

		const { gameId } = playerRow;

		// Fetch game record
		const [game] = await tx.select().from(gameTable).where(eq(gameTable.id, gameId));

		Assert.gameFound(game);

		// Parse engine state and config — schemas re-exported from engine (source of truth)
		const state: GameState = GameStateSchema.parse(game.engineState);

		const config: GameConfig = GameConfigSchema.parse(game.engineConfig);

		// Extract the requesting user's actor from the actors array
		const actors = (game.actors ?? []) as ActorState[];

		const rawActor = actors.find((a) => a.id === playerRow.actorId);

		Assert.playerFound(rawActor);

		const myActor: ActorState = ActorStateSchema.parse(rawActor);

		// Phase-scoped vote tally (voter number -> target number). Votes only
		// matter during the poll phase, so surface an empty map otherwise to
		// avoid showing stale votes on reload / late-join.
		const votes: Record<number, number> = {};
		if (game.phase === 'poll') {
			const players = await tx
				.select({
					number: gamePlayerTable.number,
					actorId: gamePlayerTable.actorId,
					voteTargetActorId: gamePlayerTable.voteTargetActorId,
				})
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));

			const numberByActorId = new Map(players.map((p) => [p.actorId, p.number]));
			for (const player of players) {
				if (player.voteTargetActorId === null) continue;
				const targetNumber = numberByActorId.get(player.voteTargetActorId);
				if (targetNumber !== undefined) {
					votes[player.number] = targetNumber;
				}
			}
		}

		const info = ClientGameInfoSchema.parse({
			id: gameId,
			status: game.status,
			phase: game.phase,
			pollCount: game.pollCount,
			stateVersion: game.phaseVersion,
			phaseStartedAt: game.phaseStartedAt.getTime(),
			phaseEndsAt: game.phaseEndsAt.getTime(),
		});

		return { info, state, config, actor: myActor, votes } satisfies GameSyncResponse;
	}),
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
				.where(and(eq(gamePlayerTable.userId, userId), eq(gameTable.status, 'active')))
				.limit(1);

			if (!playerGame) {
				return null;
			}

			return get({ gameId: playerGame.gameId });
		}),
);
