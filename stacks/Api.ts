import { StackContext, Api, Auth, Config, use } from "sst/constructs";
import { MLambdaLayers } from "./LambdaLayers";

export function MApi({ stack }: StackContext) {
    const { powertools, requests } = use(MLambdaLayers)

    const secrets = Config.Secret.create(
        stack,
        "DISCORD_OAUTH_CLIENT_ID",
        "DISCORD_OAUTH_CLIENT_SECRET"
    )
    const auth = new Auth(stack, 'auth', {
        authenticator: {
            handler: "packages/functions/api/auth.handler",
            bind: [secrets.DISCORD_OAUTH_CLIENT_ID, secrets.DISCORD_OAUTH_CLIENT_SECRET]
        }
    })

    const api = new Api(stack, "api", {
        // authorizers: {
        //     discord: {
        //         type: "jwt",
        //         jwt: {
        //             issuer: "https://discord.com/oauth2",
        //             audience: [
        //                 `${new Config.Secret(stack, "DISCORD_OATH_CLIENT_ID")}`
        //             ],
        //         },
        //     }
        // },
        defaults: {
            // authorizer: "discord"
            function: {
                bind: [auth],
                layers: [powertools],
                permissions: ['ssm']
            }
        },
        routes: {
            "GET /test/discord/authorize": "packages/functions/api/test.handler",
            "GET /test/discord/token": "packages/functions/api/test.handler"
        }
    })

    auth.attach(stack, { api })
}