import { eq } from 'drizzle-orm'
import { ulid } from 'ulid'
import { z } from 'zod'
import { createTransaction, useTransaction } from '../db/transaction'
import { EntityBaseSchema } from '../db/types'
import { InputError, isULID } from '../error'
import { fn } from '../util/fn'
import { userTable } from './user.sql'
export * as User from './'
export { getPresence } from './presence'

export enum Errors {
    UserExists = 'user.exists',
    UserNotFound = 'user.not_found',
}

export const UserInfoSchema = EntityBaseSchema.extend({
    discordId: z.string(),
    name: z.string(),
    profileImageUrl: z.string().url().optional(),
    avatar: z.string().optional().nullable(),
    isAdmin: z.boolean().default(false),
})

export type UserInfo = z.infer<typeof UserInfoSchema>

export const createOrUpdateFromDiscordProfile = fn(
    z.object({
        discordId: z.string(),
        discordName: z.string(),
        discordAvatar: z.string().optional().nullable(),
    }),
    async ({ discordId, discordName, discordAvatar }) => {
        return await createTransaction(async (tx) => {
            const [existing] = await tx
                .select({
                    id: userTable.id
                })
                .from(userTable)
                .where(eq(userTable.discordId, discordId))
                .limit(1)

            if (existing) {
                const [updated] = await tx
                    .update(userTable)
                    .set({
                        name: discordName,
                        // profileImageUrl: discordAvatar,
                    })
                    .where(eq(userTable.id, existing.id))
                    .returning()

                return UserInfoSchema.parse(updated)
            } else {
                const id = ulid();
                const [created] = await tx
                    .insert(userTable)
                    .values({
                        id,
                        discordId,
                        name: discordName,
                        // profileImageUrl: discordAvatar,
                    })
                    .returning()

                return UserInfoSchema.parse(created)
            }
        })
    }
)

export const get = fn(
    z.object({ userId: isULID() }),
    async (input) => useTransaction(async (tx) => {
        const [user] = await tx
            .select()
            .from(userTable)
            .where(eq(userTable.id, input.userId))
            .limit(1)

        if (!user) {
            throw new InputError(Errors.UserNotFound, 'User not found');
        }

        return UserInfoSchema.parse(user);
    })
)


export const update = fn(
    z.object({
        userId: isULID(),
        attributes: UserInfoSchema.pick({

        }),
    }),
    async ({ userId, attributes }) => {
        return useTransaction(async (tx) => {
            const [existing] = await tx
                .select()
                .from(userTable)
                .where(
                    eq(userTable.id, userId),

                )
                .limit(1);

            if (!existing) throw new Error('User not found');

            if (Object.keys(attributes).length === 0) return UserInfoSchema.parse(existing);

            await tx
                .update(userTable)
                .set({ ...attributes, updatedAt: new Date() })
                .where(
                    eq(userTable.id, userId),
                );

            const updated = await get({ userId })

            if (!updated) throw new Error('Update failed');

            return UserInfoSchema.parse(updated);
        });
    }
);