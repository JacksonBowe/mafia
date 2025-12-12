/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
            name: "mafia",
            removal: input?.stage === "prod" ? "retain" : "remove",
            protect: ["prod"].includes(input?.stage),
            home: "aws",
            providers: {
                aws: {
                    // profile: process.env.CI ? undefined : 'pawl-dev',
                    profile: input?.stage === "prod" ? "mafia-prod" : "mafia-dev",
                    region: "ap-southeast-2"
                },
                neon: "0.9.0"
            }
        };
    },
    async run() {

        const { readdirSync } = await import("fs");
        const outputs = {};

        for (const value of readdirSync("./infra")) {
            const result = await import("./infra/" + value);
            if (result.outputs) Object.assign(outputs, result.outputs);
        }

        return outputs;
    },
});
