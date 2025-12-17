import { NeonDatabaseUrl } from "./neon"
import { realtime, topicPrefix } from "./realtime"

export const bus = new sst.aws.Bus("Bus")

bus.subscribe('LobbyEvents', {
    handler: "./packages/functions/src/events/lobby.handler",
    link: [NeonDatabaseUrl, realtime],
}, {
    pattern: {
        detailType: [{ prefix: 'lobby.' }]
    }
})

export const disconnectSubscriber = realtime.subscribe({
    handler: "packages/functions/src/realtime/disconnect.handler",
    link: [NeonDatabaseUrl, realtime, bus]
}, {
    filter: `${topicPrefix}/$disconnect`
})