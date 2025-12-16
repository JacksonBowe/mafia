import { ulid } from "ulid";
import { z } from "zod";
import { useTransaction } from "../db/transaction";
import { EntityBaseSchema } from "../db/types";
import { isULID } from "../error";
import { fn } from "../util/fn";
import { lobbyMemberTable } from "./lobby.sql";

export const LobbyMembberInfoSchema = EntityBaseSchema.extend(
    {}
)

export const add = fn(z
    .object({
        lobbyId: isULID(),
        userId: isULID(),
    }),
    async ({ lobbyId, userId }) => useTransaction(async (tx) =>
        await tx.insert(lobbyMemberTable).values({
            id: ulid(),
            lobbyId,
            userId,
        })
    )
);

// const remove = fn(z.object({}), async (c) => {

// })