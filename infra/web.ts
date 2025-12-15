import { api } from "./api";
import { auth } from "./auth";

export const appSite = new sst.aws.StaticSite("AppSite", {
    path: "packages/web/app",
    build: {
        command: "bun ci && bun run build",
        output: "dist/spa"
    },
    environment: {
        VITE_AUTH_ENDPOINT: auth.url,
        VITE_API_ENDPOINT: api.url
    }
})