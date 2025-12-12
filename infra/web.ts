export const appSite = new sst.aws.StaticSite("AppSite", {
    path: "packages/web/app",
    build: {
        command: "bun ci && bun run build",
        output: "dist/spa"
    },
    environment: {

    }
})