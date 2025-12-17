import { boolean, pgTable, text } from 'drizzle-orm/pg-core'
import { id, timestamp, timestamps } from '../db/types'

export const userTable = pgTable('user', {
    ...id,
    ...timestamps,

    discordId: text('discord_id').notNull().unique(),
    isBot: boolean('is_bot').notNull().default(false),
    isAdmin: boolean('is_admin').notNull().default(false),
    // Optional profile details
    name: text('name').notNull(),
    // profileImageUrl: text('profile_image_url'),

    lastLoginAt: timestamp('last_login_at'),
    enabled: boolean('enabled').notNull().default(true),
})