import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTransaction } from '../../db/transaction';
import { isULID } from '../../error';
import { MessageSchema } from '../../message';
import { fn } from '../../util/fn';
import { gameTable } from '../game.sql';
import * as Assert from './assert';
import * as Log from './log';
import { GamePhaseSchema } from './schema';

/** Records a game-chat message in the audit timeline; it does not publish it. */
export const recordChatMessage = fn(
	z.object({
		gameId: isULID(),
		actorId: z.string(),
		message: MessageSchema,
	}),
	async ({ gameId, actorId, message }) =>
		createTransaction(async (tx) => {
			const [game] = await tx
				.select({ phase: gameTable.phase })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);
			Assert.gameFound(game);

			await Log.appendGameLog(tx, {
				gameId,
				type: 'game.chat.sent',
				phase: GamePhaseSchema.parse(game.phase),
				actorId,
				data: { message },
			});
			return { gameId, messageId: message.id };
		}),
);
