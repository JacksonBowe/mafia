import { NeonDatabaseUrl } from "./neon"
import { realtime } from "./realtime"

export const bus = new sst.aws.Bus("Bus")

bus.subscribe('LobbyEvents', {
    handler: "./packages/functions/src/events/lobby.handler",
    link: [NeonDatabaseUrl, realtime],
}, {
    pattern: {
        detailType: [{ prefix: 'lobby.' }]
    }
})