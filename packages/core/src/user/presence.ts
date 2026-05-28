// src/user/presence.ts
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { useTransaction } from '../db/transaction';
import { isULID } from '../error';
import { gamePlayerTable, gameTable } from '../game/game.sql';
import { lobbyMemberTable, lobbyTable } from '../lobby/lobby.sql';
import { fn } from '../util/fn';
import { PresenceSchema } from './schema';

export { PresenceSchema };
export type { Presence } from './schema';

export const getPresence = fn(
	z.object({
		userId: isULID(),
	}),
	async ({ userId }) =>
		useTransaction(async (tx) => {
			const [row] = await tx
				.select({
					lobby: {
						id: lobbyTable.id,
						name: lobbyTable.name,
					},
				})
				.from(lobbyMemberTable)
				.innerJoin(lobbyTable, eq(lobbyMemberTable.lobbyId, lobbyTable.id))
				.where(eq(lobbyMemberTable.userId, userId))
				.limit(1);

			const [gameRow] = await tx
				.select({
					gameId: gamePlayerTable.gameId,
				})
				.from(gamePlayerTable)
				.innerJoin(gameTable, eq(gameTable.id, gamePlayerTable.gameId))
				.where(eq(gamePlayerTable.userId, userId))
				.limit(1);

			return PresenceSchema.parse({
				lobby: row?.lobby ?? null,
				gameId: gameRow?.gameId ?? null,
			});
		}),
);
