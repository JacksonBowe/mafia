import { StackContext, EventBus, use } from "sst/constructs";
// import { LambdaLayers } from "./LambdaLayers";
import { Storage } from "./Storage";

export function Events({ stack }: StackContext) {
	// const { powertools } = use(LambdaLayers);
	const { lobbyTable, userTable } = use(Storage);

	const bus = new EventBus(stack, "bus");

	bus.subscribe("lobby.user_join", {
		handler: "packages/functions/src/functions/events/lobby/user_join.handler",
		bind: [lobbyTable],
		environment: {
			SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
		},
		permissions: ["iot"],
	});

	bus.subscribe("lobby.user_leave", {
		handler: "packages/functions/src/functions/events/lobby/user_leave.handler",
		bind: [lobbyTable, userTable],
		environment: {
			SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
			SST_TABLE_TABLENAME_USERTABLE: userTable.tableName,
		},
		permissions: ["iot"],
	});

	return {
		bus,
	};
}
