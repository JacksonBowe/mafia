import { StackContext, Api, Auth, Config, use } from "sst/constructs";
import { MLambdaLayers } from "./LambdaLayers";
import { MStorage } from "./Storage";

export function MApi({ stack }: StackContext) {
    const { powertools, requests } = use(MLambdaLayers)
    const { usersTable } = use(MStorage)

    const secrets = Config.Secret.create(
        stack,
        "DISCORD_OAUTH_CLIENT_ID",
        "DISCORD_OAUTH_CLIENT_SECRET"
    )

    const auth = new Auth(stack, "auth", {
        authenticator: {
          handler: "packages/functions/api/auth.handler",
        },
      });

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
                layers: [powertools],
                permissions: ['ssm', usersTable],
                environment: {
                    APP_USERS_TABLE_NAME: usersTable.tableName
                },

            }
        },
        routes: {
            "GET /manual/discord/authorize": "packages/functions/api/test.handler",
            "GET /manual/discord/token": "packages/functions/api/test.handler",
            "GET /users/me": "packages/functions/api/test.handler"
        }
    })

    auth.attach(stack, {
        api
    })

    stack.addOutputs({
        ApiEndpoint: api.url,
    });

    return {
        api
    }
}