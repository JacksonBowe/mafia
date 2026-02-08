import { NeonDatabaseUrl } from "./neon"

export const discordClientId = new sst.Secret("DiscordClientId")
export const discordClientSecret = new sst.Secret("DiscordClientSecret")


export const auth = new sst.aws.Auth("Auth", {
    issuer: {
        handler: "packages/functions/src/api/auth.handler",
        link: [discordClientId, discordClientSecret, NeonDatabaseUrl]
    }
})
