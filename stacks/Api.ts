import { StackContext, Api, Function, use } from "sst/constructs";
import { LambdaLayers } from "./LambdaLayers";
import { Storage } from "./Storage";
import { Events } from "./Events";
import { Auth } from "./Auth";

import path from "path";

export function API({ stack, app }: StackContext) {
	const { requests } = use(LambdaLayers);
	const { userTable, lobbyTable } = use(Storage);
	const { bus } = use(Events);
	const { sessionTable } = use(Auth);

	const apiHandler = "packages/functions/src/functions/rest/main.handler";

	const api = new Api(stack, "api", {
		authorizers: {
			token: {
				type: "lambda",
				function: new Function(stack, "Authorizer", {
					handler: "packages/functions/src/functionsrest/authorizer.handler",
					permissions: ["ssm"],
					layers: [requests],
					bind: [userTable, lobbyTable, sessionTable],
					environment: {
						SST_TABLE_TABLENAME_USERTABLE: userTable.tableName,
						SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
						SST_EVENTBUS_EVENTBUSNAME_BUS: bus.eventBusName,
					},
				}),
			},
		},
		defaults: {
			authorizer: "token",
			function: {
				permissions: ["ssm"],
				bind: [userTable, lobbyTable, bus, sessionTable],
				environment: {
					SST_TABLE_TABLENAME_USERTABLE: userTable.tableName,
					SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
					SST_EVENTBUS_EVENTBUSNAME_BUS: bus.eventBusName,
				},
			},
		},
		routes: {
			// AuthController
			"GET /auth/authorize/discord": { function: apiHandler, authorizer: "none" },
			"POST /auth/token/discord": { function: apiHandler, authorizer: "none" },
			"POST /auth/token/refresh": { function: apiHandler, authorizer: "none" },
			// UserController
			"GET /users/me": apiHandler,
			"GET /users/{userId}": apiHandler,
			// LobbyController
			"POST /lobbies": apiHandler,
			"GET /lobbies": apiHandler,
			"POST /lobbies/terminate": apiHandler,
			"GET /lobbies/{lobbyId}": apiHandler,
			"POST /lobbies/{lobbyId}/join": apiHandler,
			"POST /lobbies/{lobbyId}/terminate": apiHandler,
			"POST /lobbies/leave": apiHandler,
			"POST /lobbies/start": apiHandler,
		},
	});

	stack.addOutputs({
		ApiEndpoint: api.url,
	});

	return {
		api,
	};
}
