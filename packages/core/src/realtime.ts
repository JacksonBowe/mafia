import { IoTDataPlaneClient, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { Resource } from "sst";
import { z } from "zod";
import { fn } from "./util/fn";

// --------------------
// Types + event definition
// --------------------

export type RealtimeResource = {
    authorizer: string;
    endpoint: string; // hostname, no protocol
    type?: string;
};

export type RealtimeEventDef<Type extends string, Schema extends z.ZodTypeAny> = {
    type: Type;
    schema: Schema;
    topic: (props: z.output<Schema>) => string;

    build: (
        input: z.input<Schema>,
    ) => {
        topic: string;
        payload: {
            type: Type;
            properties: z.output<Schema>;
        };
    };
};

export function defineRealtimeEvent<Type extends string, Schema extends z.ZodTypeAny>(
    type: Type,
    schema: Schema,
    topic: (props: z.output<Schema>) => string,
): RealtimeEventDef<Type, Schema> {
    return {
        type,
        schema,
        topic,
        build: (input) => {
            const properties = schema.parse(input);
            return {
                topic: topic(properties),
                payload: {
                    type,
                    properties,
                },
            };
        },
    };
}

// --------------------
// Message schema (what clients receive)
// --------------------

export const RealtimeMessageSchema = z.object({
    type: z.string(),
    properties: z.looseObject({}),
});
export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>;

// --------------------
// Publisher (Lambda/server only execution, but located in core)
// --------------------

const encoder = new TextEncoder();

function topicPrefix(): string {
    return `${Resource.App.name}/${Resource.App.stage}`;
}

function joinTopic(prefix: string, topic: string): string {
    if (!prefix) return topic;
    return prefix.endsWith("/") ? `${prefix}${topic}` : `${prefix}/${topic}`;
}

function iotClient(resource: RealtimeResource): IoTDataPlaneClient {
    return new IoTDataPlaneClient({
        endpoint: `https://${resource.endpoint}`,
    });
}

export namespace realtime {
    /**
     * Raw publish: you provide topic + type + properties.
     * This is the "escape hatch".
     */
    export const publishRaw = fn(
        z.object({
            resource: z.object({
                authorizer: z.string(),
                endpoint: z.string(),
                type: z.string().optional(),
            }),
            topic: z.string(),
            type: z.string(),
            properties: z.unknown(),
        }),
        async ({ resource, topic, type, properties }) => {
            const fullTopic = joinTopic(topicPrefix(), topic);

            await iotClient(resource).send(
                new PublishCommand({
                    topic: fullTopic,
                    qos: 1,
                    payload: encoder.encode(JSON.stringify({ type, properties })),
                }),
            );

            return { topic: fullTopic } as const;
        },
    );

    /**
     * Typed publish: deterministic topic + validated payload, derived from declared event.
     */
    export async function publish<E extends RealtimeEventDef<string, z.ZodTypeAny>>(
        resource: RealtimeResource,
        event: E,
        input: z.input<E["schema"]>,
    ) {
        const built = event.build(input);
        return publishRaw({
            resource,
            topic: built.topic,
            type: built.payload.type,
            properties: built.payload.properties,
        });
    }
}
