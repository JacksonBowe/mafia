import { StackContext, EventBus, use } from "sst/constructs";
import { LambdaLayers } from "./LambdaLayers";
import { Storage } from "./Storage";

export function Events({ stack }: StackContext) {
	const { powertools } = use(LambdaLayers);
	const { lobbyTable, userTable } = use(Storage);

	const bus = new EventBus(stack, "bus");

	bus.subscribe("lobby.user_join", {
		handler: "packages/functions/events/lobby/user_join.handler",
		bind: [lobbyTable],
		permissions: ["iot"],
		layers: [powertools],
	});

	bus.subscribe("lobby.user_leave", {
		handler: "packages/functions/events/lobby/user_leave.handler",
		bind: [lobbyTable, userTable],
		permissions: ["iot"],
		layers: [powertools],
	});

	return {
		bus,
	};
}
