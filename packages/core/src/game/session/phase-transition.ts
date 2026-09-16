import { eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';
import { useTransaction } from '../../db/transaction';
import { isULID } from '../../error';
import { gamePhaseTransitionTable } from '../game.sql';
import { GamePhaseSchema } from './schema';

/** Persisted result for one idempotent game-loop phase command. */
export const AdvancePhaseTransitionSchema = z.object({
	gameId: isULID(),
	continue: z.boolean(),
	waitSeconds: z.number().int().nonnegative(),
	phase: GamePhaseSchema,
	pollCount: z.number().int().nonnegative(),
	phaseVersion: z.number().int().nonnegative(),
});
export type AdvancePhaseTransition = z.infer<typeof AdvancePhaseTransitionSchema>;

/** Reads a previously committed result for a repeated loop command. */
export const get = async (gameId: string, idempotencyKey: string) =>
	useTransaction(async (tx) => {
		const [transition] = await tx
			.select({ result: gamePhaseTransitionTable.result })
			.from(gamePhaseTransitionTable)
			.where(
				and(
					eq(gamePhaseTransitionTable.gameId, gameId),
					eq(gamePhaseTransitionTable.idempotencyKey, idempotencyKey),
				),
			)
			.limit(1);
		return transition ? AdvancePhaseTransitionSchema.parse(transition.result) : null;
	});

/** Persists the result before phase side effects run after commit. */
export const persist = async (input: {
	idempotencyKey: string;
	expectedPhaseVersion: number;
	result: AdvancePhaseTransition;
}) =>
	useTransaction(async (tx) => {
		await tx.insert(gamePhaseTransitionTable).values({
			id: ulid(),
			gameId: input.result.gameId,
			idempotencyKey: input.idempotencyKey,
			expectedPhaseVersion: input.expectedPhaseVersion,
			result: input.result,
		});
		return input.result;
	});
