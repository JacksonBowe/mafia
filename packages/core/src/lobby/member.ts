import { and, eq } from "drizzle-orm";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import { ulid } from "ulid";
import { z } from "zod";
import { afterTx, useTransaction } from "../db/transaction";
import { EntityBaseSchema } from "../db/types";
import { InputError, isULID } from "../error";
import { defineEvent } from "../event";
import { fn } from "../util/fn";
import { lobbyMemberTable, lobbyTable } from "./lobby.sql";

export enum Errors {
    LobbyMemberNotFound = 'lobby.member.not_found',
}

export const Events = {
    MemberJoin: defineEvent(
        'lobby.member.join',
        z.object({
            lobbyId: isULID(),
            userId: isULID(),
        }),
    ),
    MemberLeave: defineEvent(
        'lobby.member.leave',
        z.object({
            lobbyId: isULID(),
            userId: isULID(),
        }),
    )
}

export const LobbyMembberInfoSchema = EntityBaseSchema.extend(
    {
        lobbyId: isULID(),
        userId: isULID(),
    }
)

export type LobbyMemberInfo = z.infer<typeof LobbyMembberInfoSchema>;

export const add = fn(z
    .object({
        lobbyId: isULID(),
        userId: isULID(),
    }),
    async ({ lobbyId, userId }) => useTransaction(async (tx) => {

        await tx.insert(lobbyMemberTable).values({
            id: ulid(),
            lobbyId,
            userId,
        })

        afterTx(() => {
            bus.publish(Resource.Bus, Events.MemberJoin, {
                lobbyId,
                userId,
            })
        })
    })
);

export const remove = fn(
    z.object({
        lobbyId: isULID(),
        userId: isULID(),
        notifyEvent: z.boolean().optional().default(true),
    }),
    async ({ lobbyId, userId, notifyEvent }) =>
        useTransaction(async (tx) => {
            const [deleted] = await tx
                .delete(lobbyMemberTable)
                .where(
                    and(
                        eq(lobbyMemberTable.lobbyId, lobbyId),
                        eq(lobbyMemberTable.userId, userId),
                    ),
                )
                .returning({
                    lobbyId: lobbyMemberTable.lobbyId,
                    userId: lobbyMemberTable.userId,
                })

            if (!deleted) {
                throw new InputError(Errors.LobbyMemberNotFound, 'User is not in this lobby')
            }

            if (notifyEvent) {
                afterTx(() => {
                    bus.publish(Resource.Bus, Events.MemberLeave, deleted)
                })
            }

            return deleted
        }),
)

export const promote = fn(
    z.object({
        lobbyId: isULID(),
        userId: isULID(),
    }),
    async ({ lobbyId, userId }) =>
        useTransaction(async (tx) => {
            const [member] = await tx
                .select({ userId: lobbyMemberTable.userId })
                .from(lobbyMemberTable)
                .where(
                    and(
                        eq(lobbyMemberTable.userId, userId),
                        eq(lobbyMemberTable.lobbyId, lobbyId),
                    ),
                )
                .limit(1)

            if (!member) {
                throw new InputError(Errors.LobbyMemberNotFound, 'User is not in this lobby')
            }

            const [updated] = await tx
                .update(lobbyTable)
                .set({ hostId: member.userId })
                .where(eq(lobbyTable.id, lobbyId))
                .returning({ id: lobbyTable.id, hostId: lobbyTable.hostId })

            return updated
        }),
)