import { User } from '@mafia/core/user/index';
import { issuer } from '@openauthjs/openauth';
import { DiscordProvider } from "@openauthjs/openauth/provider/discord";
import { handle } from 'hono/aws-lambda';
import { Resource } from 'sst/resource';
import { subjects } from '../subjects';

const app = issuer({
    allow: async () => {
        return true
    },
    subjects,
    providers: {
        discord: DiscordProvider({
            clientID: Resource.DiscordClientId.value,
            clientSecret: Resource.DiscordClientSecret.value,
            scopes: ['identify']
        })
    },

    success: async (ctx, value) => {
        if (value.provider === 'discord') {
            type DiscordUser = {
                id: string;
                username: string;
                avatar: string | null;
                public_flags: number;
                flags: number;
                banner: string | null;
                accent_color: number | null;
                global_name: string | null;
                avatar_decoration_data: Record<string, unknown> | null;
            };

            const accessToken = value.tokenset.access;

            // Fetch user profile from Microsoft Graph
            const res = await fetch("https://discord.com/api/users/@me", {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!res.ok) {
                throw new Error("Failed to fetch Discord user profile");
            }

            const profile = await res.json() as DiscordUser;

            console.log(profile)

            // You can now store this in your DB, check if user exists, etc.
            const user = await User.createOrUpdateFromDiscordProfile({
                discordId: profile.id,
                discordName: profile.global_name || profile.username,
                discordAvatar: profile.avatar,
                // profileImageUrl: profileImageUrl,
            })
            // For now, return a subject to complete the OpenAuth login
            return ctx.subject("user", {
                name: user.name,
                discordId: profile.id,
                userId: user.id
            });
        }
        throw new Error('Invalid Provider');
    },
});

export const handler = handle(app);
