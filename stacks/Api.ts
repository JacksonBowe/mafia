import { StackContext, Api, Function, use } from "sst/constructs";
import { LambdaLayers } from "./LambdaLayers";
import { Storage } from "./Storage";
import { Events } from "./Events";
import { Auth } from "./Auth";

export function API({ stack, app }: StackContext) {
	const { powertools, requests, jose } = use(LambdaLayers);
	const { userTable, lobbyTable } = use(Storage);
	const { bus } = use(Events);
	const { sessionTable } = use(Auth);

	const apiHandler = "packages/functions/src/functions/rest/main.handler";

	const api = new Api(stack, "api", {
		authorizers: {
			token: {
				type: "lambda",
				function: new Function(stack, "Authorizer", {
					handler: "packages/functions/src/functions/rest/authorizer.handler",
					permissions: ["ssm"],
					layers: [requests, jose],
					bind: [userTable, lobbyTable, sessionTable],
					environment: {
						SST_TABLE_TABLENAME_USERTABLE: userTable.tableName,
						SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
						SST_EVENTBUS_EVENTBUSNAME_BUS: bus.eventBusName,
						SST_TABLE_TABLENAME_SESSIONTABLE: sessionTable.tableName,
					},
				}),
			},
		},
		defaults: {
			authorizer: "token",
			function: {
				permissions: ["ssm", "iot:Publish"],
				bind: [userTable, lobbyTable, bus, sessionTable],
				environment: {
					SST_TABLE_TABLENAME_USERTABLE: userTable.tableName,
					SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
					SST_EVENTBUS_EVENTBUSNAME_BUS: bus.eventBusName,
					SST_TABLE_TABLENAME_SESSIONTABLE: sessionTable.tableName,
				},
			},
		},
		routes: {
			// AuthController
			"GET /auth/authorize/discord": { function: { handler: apiHandler, layers: [jose, requests] }, authorizer: "none" },
			"POST /auth/token/discord": { function: { handler: apiHandler, layers: [jose, requests] }, authorizer: "none" },
			"POST /auth/token/refresh": { function: { handler: apiHandler, layers: [jose, requests] }, authorizer: "none" },
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
			// ChatController
			"POST /chat/message": apiHandler,
		},
	});

	stack.addOutputs({
		ApiEndpoint: api.url,
	});

	return {
		api,
	};
}
