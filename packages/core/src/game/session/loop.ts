import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTransaction } from '../../db/transaction';
import { isULID } from '../../error';
import { fn } from '../../util/fn';
import { gameTable } from '../game.sql';
import * as Assert from './assert';

/**
 * Stores the Step Functions execution ARN after game-loop startup. Startup
 * lifecycle code owns this mutation; phase advancement only consumes it.
 */
export const setGameLoopExecutionArn = fn(
	z.object({
		gameId: isULID(),
		executionArn: z.string().min(1),
	}),
	async ({ gameId, executionArn }) =>
		createTransaction(async (tx) => {
			const [updated] = await tx
				.update(gameTable)
				.set({ gameLoopExecutionArn: executionArn })
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id });

			Assert.gameFound(updated);

			return { gameId };
		}),
);
