import { NeonDatabaseUrl } from "./neon"

export const bus = new sst.aws.Bus("Bus")

bus.subscribe('LobbyEvents', {
    handler: "./packages/functions/src/events/lobby.handler",
    link: [NeonDatabaseUrl],
}, {
    pattern: {
        detailType: [{ prefix: 'lobby.' }]
    }
})