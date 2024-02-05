import { StackContext, Api, Auth, Config, Function, use } from "sst/constructs";
import { MLambdaLayers } from "./LambdaLayers";
import { MStorage } from "./Storage";

export function MApi({ stack }: StackContext) {
	const { powertools, requests } = use(MLambdaLayers);
	const { userTable, lobbyTable } = use(MStorage);

	const secrets = Config.Secret.create(stack, "DISCORD_OAUTH_CLIENT_ID", "DISCORD_OAUTH_CLIENT_SECRET");

	const auth = new Auth(stack, "auth", {
		authenticator: {
			handler: "packages/functions/api/auth.handler",
            // prefix: "stub"
		},
	});

	const api = new Api(stack, "api", {
		authorizers: {
			token: {
				type: "lambda",
				function: new Function(stack, "Authorizer", {
					handler: "packages/functions/api/authorizer.handler",
					permissions: ["ssm"],
                    bind: [userTable, lobbyTable],
                    environment: {
                        APP_USER_TABLE_NAME: userTable.tableName,
                        APP_LOBBY_TABLE_NAME: lobbyTable.tableName
                    },
				}),
			},
		},
		defaults: {
			authorizer: "token",
			function: {
				layers: [powertools],
				permissions: ["ssm"],
                bind: [userTable, lobbyTable],
				environment: {
					APP_USER_TABLE_NAME: userTable.tableName,
                    APP_LOBBY_TABLE_NAME: lobbyTable.tableName
				},
			},
		},
		routes: {
            // AuthController
            "GET /auth/authorize/discord"       : { function: "packages/functions/api/auth.handler", authorizer: "none" },
            "POST /auth/token/discord"          : { function: "packages/functions/api/auth.handler", authorizer: "none" },
            // UserController
			"GET /users/me"                     : "packages/functions/api/users.handler",
            "GET /users/{userId}"               : "packages/functions/api/users.handler",
            // LobbyController
            "POST /lobbies"                     : "packages/functions/api/lobbies.handler",
            "GET /lobbies"                      : "packages/functions/api/lobbies.handler",
            "GET /lobbies/{lobbyId}"            : "packages/functions/api/lobbies.handler",
            "POST /lobbies/{lobbyId}/join"      : "packages/functions/api/lobbies.handler",
            "POST /lobbies/{lobbyId}/terminate" : "packages/functions/api/lobbies.handler",
            "POST /lobbies/leave"               : "packages/functions/api/lobbies.handler",
            "POST /lobbies/start"               : "packages/functions/api/lobbies.handler",
		},
	});

	// auth.attach(stack, {
	// 	api,
    //     prefix: "/junk"
	// });

	stack.addOutputs({
		ApiEndpoint: api.url,
	});

	return {
		api,
	};
}
