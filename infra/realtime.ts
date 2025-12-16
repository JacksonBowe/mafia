import { auth } from "./auth";
import { NeonDatabaseUrl } from "./neon";

export const topicPrefix = `${$app.name}/${$app.stage}`;
export const realtime = new sst.aws.Realtime("Realtime", {
    authorizer: {
        handler: "authorizer.handler",
        link: [NeonDatabaseUrl, auth],
        environment: {
            TOPIC_PREFIX: topicPrefix,
        }
    }

});