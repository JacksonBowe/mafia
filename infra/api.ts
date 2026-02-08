import { auth, discordClientId, discordClientSecret } from "./auth";
import { bus } from "./bus";
import { NeonDatabaseUrl } from "./neon";
import { realtime } from "./realtime";

export const api = new sst.aws.Function('Api', {
    url: true,
    link: [NeonDatabaseUrl, discordClientId, discordClientSecret, auth, bus, realtime],
    handler: "packages/functions/src/api/index.handler",
})