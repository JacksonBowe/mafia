// src/user/user.ts (or wherever your user domain funcs live)
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { useTransaction } from '../db/transaction';
import { RelatedEntitySchema } from '../db/types';
import { isULID } from '../error';
import { lobbyMemberTable, lobbyTable } from '../lobby/lobby.sql';
import { fn } from '../util/fn';
// import { gamePlayerTable } from '../game/player.sql' // TODO: when game exists

export const PresenceSchema = z.object({
	lobby: RelatedEntitySchema.nullable().optional(),
	// gameId: isULID().nullable(), // TODO
});

export type Presence = z.infer<typeof PresenceSchema>;

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

			// TODO: when game exists
			// const [gameRow] = await tx
			//   .select({ gameId: gamePlayerTable.gameId })
			//   .from(gamePlayerTable)
			//   .where(eq(gamePlayerTable.userId, userId))
			//   .limit(1)

			return PresenceSchema.parse({
				lobby: row?.lobby ?? null,
				// gameId: gameRow?.gameId ?? null,
			});
		}),
);
