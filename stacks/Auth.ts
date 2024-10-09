import { StackContext, Auth as SSTAuth, Config, Table, Cron } from "sst/constructs";

export function Auth({ stack }: StackContext) {
	const secrets = Config.Secret.create(stack, "DISCORD_OAUTH_CLIENT_ID", "DISCORD_OAUTH_CLIENT_SECRET");

	const auth = new SSTAuth(stack, "auth", {
		authenticator: {
			handler: "packages/functions/src/functions/rest/auth.handler",
			// prefix: "stub"
		},
	});

	// Session table
	const sessionTable = new Table(stack, "SessionTable", {
		fields: {
			userId: "string",
			accessToken: "string",
			refreshToken: "string",
			expiresAt: "number",
		},
		primaryIndex: { partitionKey: "userId" },
		globalIndexes: {
			itemsByExpiresAt: { partitionKey: "expiresAt" },
		},
	});

	// TODO: Script to run once per week to remove expired sessions
	// new Cron(stack, "RemoveExpiredSessions", {
	// 	schedule: "cron(0 0 ? * 1 *)",
	// 	job: {
	// 		function: {
	// 			handler: "packages/functions/src/functions/cron/remove_expired_sessions.handler",
	// 			permissions: ["ssm"],
	// 			bind: [sessionTable],
	// 		},
	// 		environment: {
	// 			// SESSION_TABLE_NAME: sessionTable.tableName
	// 			SST_TABLE_TABLENAME_SESSIONTABLE: sessionTable.tableName,
	// 		},
	// 	},
	// });

	return {
		auth,
		sessionTable,
	};
}
