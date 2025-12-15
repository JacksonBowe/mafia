import { auth, discordClientId, discordClientSecret } from "./auth";
import { NeonDatabaseUrl } from "./neon";

export const api = new sst.aws.Function('Api', {
    url: true,
    link: [NeonDatabaseUrl, discordClientId, discordClientSecret, auth],
    handler: "packages/functions/src/api/index.handler",
})