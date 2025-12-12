import { NeonDatabaseUrl } from "./neon"

export const discordClientId = new sst.Secret("DiscordClientId")
export const discordSecret = new sst.Secret("DiscordClientSecret")


export const auth = new sst.aws.Auth("UNSAuth", {
    // authorizer: "packages/functions/src/api/uns/auth.handler",
    issuer: {
        handler: "packages/functions/src/api/uns/auth.handler",
        link: [discordClientId, discordSecret, NeonDatabaseUrl]
    }
})
