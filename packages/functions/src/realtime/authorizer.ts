import { topicPrefix } from "@mafia/core/realtime";
import { realtime } from "sst/aws/realtime";

export const handler = realtime.authorizer(async (token) => {
    const prefix = topicPrefix();

    // console.log("Authorizing token:", token);

    const isValid = token === "PLACEHOLDER_TOKEN";

    console.log('Validating token:', { token, isValid });

    return isValid
        ? {
            publish: [`${prefix}/*`],
            subscribe: [`${prefix}/*`],
        }
        : {
            publish: [],
            subscribe: [],
        };
});