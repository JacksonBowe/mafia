import { api } from "./api";
import { auth } from "./auth";
import { realtime, topicPrefix } from "./realtime";

export const appSite = new sst.aws.StaticSite("AppSite", {
    path: "packages/web/app",
    build: {
        command: "bun ci && bun run build",
        output: "dist/spa"
    },
    environment: {
        VITE_AUTH_ENDPOINT: auth.url,
        VITE_API_ENDPOINT: api.url,
        VITE_REALTIME_ENDPOINT: realtime.endpoint,
        VITE_REALTIME_AUTHORIZER: realtime.authorizer,
        VITE_REALTIME_PREFIX: topicPrefix,
        VITE_STAGE: $app.stage
    }
})

export const outputs = {
    RealtimeEndpoint: realtime.endpoint,
}