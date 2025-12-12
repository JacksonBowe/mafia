import { StackContext, Function, use } from "sst/constructs";
import { LambdaLayers } from "./LambdaLayers";
import { Storage } from "./Storage";
import { Events } from "./Events";

export function Spikes({ stack }: StackContext) {
	const { powertools } = use(LambdaLayers);
	const { userTable, lobbyTable } = use(Storage);
	const { bus } = use(Events);

	const seedUsers = new Function(stack, "SeedUsers", {
		handler: "packages/functions/src/functions/spikes/seed_users.handler",
		bind: [userTable],
	});

	const seedLobbies = new Function(stack, "SeedLobbies", {
		handler: "packages/functions/src/functions/spikes/seed_lobbies.handler",
		bind: [userTable, lobbyTable, bus],
	});

	const userJoinLobby = new Function(stack, "UserJoinLobby", {
		handler: "packages/functions/src/functions/spikes/user_join_lobby.handler",
		bind: [userTable, lobbyTable, bus],
	});
}
