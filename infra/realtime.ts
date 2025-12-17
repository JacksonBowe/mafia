import bus from "../packages/web/app/src/boot/bus";
import { auth } from "./auth";
import { NeonDatabaseUrl } from "./neon";

export const topicPrefix = `${$app.name}/${$app.stage}`;
export const realtime = new sst.aws.Realtime("Realtime", {
    authorizer: {
        handler: "packages/functions/src/realtime/authorizer.handler",
        link: [NeonDatabaseUrl, auth],
        environment: {
            TOPIC_PREFIX: topicPrefix,
        }
    }

});

realtime.subscribe({
    handler: "packages/functions/src/realtime/disconnect.handler",
    link: [NeonDatabaseUrl, bus, realtime]
}, {
    filter: `${topicPrefix}/$disconnect`
}

)