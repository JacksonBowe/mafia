import { ActorStateSchema } from '@mafia/engine';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTransaction } from '../../db/transaction';
import { InputError, isULID } from '../../error';
import { fn } from '../../util/fn';
import { gamePlayerTable, gameTable } from '../game.sql';
import * as Assert from './assert';
import * as Log from './log';
import { GamePhaseSchema, GameSessionErrors as SessionErrors } from './schema';

const ActorIdTargetsSchema = z.array(z.string());

/**
 * Sets one ordered target per engine action slot for an alive player.
 * Allowed only during an active game's evening phase; input count and order
 * must exactly match the actor's `possibleTargets` slots.
 */
export const setTargets = fn(
	z.object({
		gameId: isULID(),
		userId: z.string(),
		targetActorIds: ActorIdTargetsSchema,
	}),
	async ({ gameId, userId, targetActorIds }) =>
		createTransaction(async (tx) => {
			const [row] = await tx
				.select({ actors: gameTable.actors, phase: gameTable.phase, status: gameTable.status })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.for('update');

			Assert.gameFound(row);
			Assert.gameActive(row);
			if (row.phase !== 'evening') {
				throw new InputError(
					SessionErrors.GameInvalidState,
					'Targets can only be set during the evening phase',
				);
			}

			const [player] = await tx
				.select({ actorId: gamePlayerTable.actorId })
				.from(gamePlayerTable)
				.where(and(eq(gamePlayerTable.gameId, gameId), eq(gamePlayerTable.userId, userId)))
				.limit(1);

			Assert.playerFound(player);

			const actors = ActorStateSchema.array().parse(row.actors);
			const actor = actors.find((item) => item.id === player.actorId);

			Assert.playerFound(actor);
			Assert.actorAlive(actor);
			if (targetActorIds.length !== actor.possibleTargets.length) {
				throw new InputError(SessionErrors.InvalidTarget, 'Invalid target count');
			}

			const numbersByActorId = new Map(actors.map((item) => [item.id, item.number]));

			for (const [index, targetActorId] of targetActorIds.entries()) {
				const targetNumber = numbersByActorId.get(targetActorId);
				const allowed = actor.possibleTargets[index] ?? [];
				if (targetNumber === undefined || !allowed.includes(targetNumber)) {
					throw new InputError(SessionErrors.InvalidTarget, 'Invalid target');
				}
			}

			const [updated] = await tx
				.update(gamePlayerTable)
				.set({ targetActorIds })
				.where(and(eq(gamePlayerTable.gameId, gameId), eq(gamePlayerTable.userId, userId)))
				.returning({ id: gamePlayerTable.id });

			Assert.playerFound(updated);

			await Log.appendGameLog(tx, {
				gameId,
				type: 'game.targets.set',
				phase: GamePhaseSchema.parse(row.phase),
				actorId: player.actorId,
				data: {
					actorNumber: actor.number ?? null,
					targetActorIds,
					targetActorNumbers: targetActorIds.map(
						(id) => numbersByActorId.get(id) ?? null,
					),
				},
			});

			return { gameId, userId, targetActorIds };
		}),
);
