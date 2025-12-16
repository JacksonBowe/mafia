import { DrizzleQueryError, eq, inArray } from 'drizzle-orm'
import { ulid } from 'ulid'
import { z } from 'zod'
import { createTransaction, useTransaction } from '../db/transaction'
import {
    EntityBaseSchema,
    getConstraintName,
    isUniqueViolation,
    RelatedEntitySchema
} from '../db/types'
import { InputError, isULID } from '../error'
import { userTable } from '../user/user.sql'
import { fn } from '../util/fn'
import { lobbyMemberTable, lobbyTable } from './lobby.sql'
import * as Member from './member'
export * as Lobby from './'
export { Member }

export enum Errors {
    LobbyExists = 'lobby.exists',
    LobbyDuplicateHost = 'lobby.duplicate_host',
    LobbyNotFound = 'lobby.not_found',
}

export const LobbyInfoSchema = EntityBaseSchema.extend({
    name: z.string(),
    host: RelatedEntitySchema,
    config: z.object({}).passthrough(),
    members: z.array(RelatedEntitySchema),
})

export type LobbyInfo = z.infer<typeof LobbyInfoSchema>

export const create = fn(
    z.object({
        hostId: isULID(),
        name: z.string(),
        config: z.object({}),
    }),
    async ({ hostId, name, config }) => {
        const id = ulid()

        try {
            const lobby = await createTransaction(async (tx) => {
                const [newLobby] = await tx
                    .insert(lobbyTable)
                    .values({
                        id,
                        hostId,
                        name,
                        config,
                    })
                    .returning()

                // Host must also be a member (atomic)
                await Member.add({ lobbyId: id, userId: hostId })

                return newLobby
            })

            // At creation time we did not load members; we just know the rule was enforced.
            return LobbyInfoSchema.parse({
                ...lobby,
                membersLoaded: false,
            })
        } catch (err) {
            if (err instanceof DrizzleQueryError) {
                if (isUniqueViolation(err)) {
                    const constraint = getConstraintName(err)

                    if (constraint === 'lobby_name_uq') {
                        throw new InputError(Errors.LobbyExists, 'Lobby name already in use')
                    }

                    if (constraint === 'lobby_host_uq') {
                        throw new InputError(
                            Errors.LobbyDuplicateHost,
                            'User is already hosting a lobby'
                        )
                    }
                }

                // if it wasn't a unique violation, rethrow and let onError handle it
                throw err
            }
        }
    },
)

export const list = () =>
    useTransaction(async (tx) => {
        const lobbies = await tx
            .select({
                id: lobbyTable.id,
                name: lobbyTable.name,
                host: {
                    id: userTable.id,
                    name: userTable.name,
                },
                config: lobbyTable.config,
                createdAt: lobbyTable.createdAt,
                updatedAt: lobbyTable.updatedAt,
            })
            .from(lobbyTable)
            .innerJoin(userTable, eq(userTable.id, lobbyTable.hostId))

        if (lobbies.length === 0) return []

        const lobbyIds = lobbies.map((l) => l.id)

        const membersRows = await tx
            .select({
                lobbyId: lobbyMemberTable.lobbyId,
                id: userTable.id,
                name: userTable.name,
            })
            .from(lobbyMemberTable)
            .innerJoin(userTable, eq(userTable.id, lobbyMemberTable.userId))
            .where(inArray(lobbyMemberTable.lobbyId, lobbyIds))

        const membersByLobby = new Map<string, Array<{ id: string; name: string }>>()
        for (const row of membersRows) {
            const arr = membersByLobby.get(row.lobbyId) ?? []
            arr.push({ id: row.id, name: row.name })
            membersByLobby.set(row.lobbyId, arr)
        }

        return lobbies.map((l) =>
            LobbyInfoSchema.parse({
                ...l,
                members: membersByLobby.get(l.id) ?? [],
            }),
        )
    })

export const get = fn(
    z.object({
        lobbyId: isULID(),
    }),
    async ({ lobbyId }) =>
        useTransaction(async (tx) => {
            const [lobby] = await tx
                .select({
                    id: lobbyTable.id,
                    name: lobbyTable.name,
                    host: {
                        id: userTable.id,
                        name: userTable.name,
                    },
                    config: lobbyTable.config,
                    createdAt: lobbyTable.createdAt,
                    updatedAt: lobbyTable.updatedAt,
                })
                .from(lobbyTable)
                .innerJoin(userTable, eq(userTable.id, lobbyTable.hostId))
                .where(eq(lobbyTable.id, lobbyId))

            if (!lobby) {
                throw new InputError(Errors.LobbyNotFound, 'Lobby not found')
            }

            const members = await tx
                .select({
                    id: userTable.id,
                    name: userTable.name,
                })
                .from(lobbyMemberTable)
                .innerJoin(userTable, eq(userTable.id, lobbyMemberTable.userId))
                .where(eq(lobbyMemberTable.lobbyId, lobbyId))

            return LobbyInfoSchema.parse({
                ...lobby,
                members,
            })
        }),
)

export const terminate = fn(
    z.object({
        lobbyId: isULID(),
    }),
    async ({ lobbyId }) =>
        useTransaction(async (tx) => {
            const [lobby] = await tx
                .select({ id: lobbyTable.id })
                .from(lobbyTable)
                .where(eq(lobbyTable.id, lobbyId))
                .limit(1)

            if (!lobby) {
                throw new InputError(Errors.LobbyNotFound, 'Lobby does not exist')
            }

            await tx
                .delete(lobbyMemberTable)
                .where(eq(lobbyMemberTable.lobbyId, lobbyId))

            await tx
                .delete(lobbyTable)
                .where(eq(lobbyTable.id, lobbyId))

            return { lobbyId }
        }),
)
