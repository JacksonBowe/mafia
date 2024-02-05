import { StackContext, Api, Auth, Config, Function, use } from "sst/constructs";
import { MLambdaLayers } from "./LambdaLayers";
import { MStorage } from "./Storage";

export function MApi({ stack }: StackContext) {
	const { powertools, requests } = use(MLambdaLayers);
	const { usersTable, lobbiesTable } = use(MStorage);

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
                    bind: [usersTable, lobbiesTable],
                    environment: {
                        APP_USERS_TABLE_NAME: usersTable.tableName,
                        APP_LOBBIES_TABLE_NAME: lobbiesTable.tableName
                    },
				}),
			},
		},
		defaults: {
			authorizer: "token",
			function: {
				layers: [powertools],
				permissions: ["ssm"],
                bind: [usersTable, lobbiesTable],
				environment: {
					APP_USERS_TABLE_NAME: usersTable.tableName,
                    APP_LOBBIES_TABLE_NAME: lobbiesTable.tableName
				},
			},
		},
		routes: {
            // AuthController
            "GET /auth/authorize/discord": { function: "packages/functions/api/auth.handler", authorizer: "none" },
            "POST /auth/token/discord": { function: "packages/functions/api/auth.handler", authorizer: "none" },
            // UserController
			"GET /users/me": "packages/functions/api/users.handler",
            "GET /users/{userId}": "packages/functions/api/users.handler",
            // LobbyController
            "POST /lobby"                   : "packages/functions/lobby.handler",
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
