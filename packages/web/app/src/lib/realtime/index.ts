import { ref, computed } from "vue";
import { iot, mqtt } from "aws-iot-device-sdk-v2";

import { bus } from "src/boot/bus";
import { useAuthStore } from "src/stores/auth";
import { getLogger } from "loglevel";
import { uid } from "quasar";
import { RealtimeMessageSchema } from "@mafia/core/realtime/index";

const log = getLogger('realtime');


type Status = "idle" | "connecting" | "connected" | "disconnected" | "error";

// ---- singleton state (module-level) ----
const endpoint = import.meta.env.VITE_REALTIME_ENDPOINT!;
const authorizer = import.meta.env.VITE_REALTIME_AUTHORIZER!;
const prefix = import.meta.env.VITE_REALTIME_PREFIX!;

const status = ref<Status>("idle");
const lastError = ref<unknown | null>(null);

const connection = ref<mqtt.MqttClientConnection | null>(null);
const subscriptions = ref<string[]>([]);
const subscriptionQueue = ref<string[]>([]);

const clientId = "client_" + uid();
let reconnecting = false;

function finalTopic(topic: string) {
    return topic.startsWith(prefix) ? topic : `${prefix}${topic}`;
}

function wireHandlers(conn: mqtt.MqttClientConnection) {
    conn.on("connect", () => {
        log.info?.("connected", { clientId });
        status.value = "connected";
        reconnecting = false;
        processQueuedSubscriptions();
    });

    conn.on("interrupt", (e) => {
        log.warn?.("interrupt", e);
        void reconnect();
    });

    conn.on("resume", (...args) => log.debug?.("resume", ...args));

    conn.on("disconnect", (...args) => {
        log.warn?.("disconnect", ...args);
        if (status.value !== "disconnected") status.value = "disconnected";
    });

    conn.on("closed", (...args) => {
        log.warn?.("closed", ...args);
        if (status.value !== "disconnected") status.value = "disconnected";
    });

    conn.on("error", (e) => {
        log.error?.("error", e);
        lastError.value = e;
        status.value = "error";
    });

    conn.on("message", (topic, payload) => {
        const text = new TextDecoder("utf-8").decode(new Uint8Array(payload));

        try {
            const raw = JSON.parse(text);
            const msg = RealtimeMessageSchema.parse(raw);

            log.debug?.("message", { topic, type: msg.type });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bus.emit(msg.type as any, msg.properties);
        } catch (err) {
            // avoid spamming full payload at higher volumes if you like
            log.warn?.("message_parse_failed", { topic, text }, err);
        }
    });
}

async function connect() {
    const a = useAuthStore();
    const token = a.session?.accessToken;

    if (!token) {
        log.debug?.("connect_skipped_no_token");
        return;
    }

    // Reset any existing connection
    if (connection.value) {
        log.debug?.("disconnect_existing_before_connect");
        try {
            await connection.value.disconnect();
        } catch (e) {
            log.warn?.("disconnect_existing_failed", e);
        }
        connection.value = null;
    }

    status.value = "connecting";
    lastError.value = null;

    log.info?.("connecting", { endpoint, authorizer, clientId });

    const config = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets()
        .with_clean_session(false)
        .with_client_id(clientId)
        .with_endpoint(endpoint)
        .with_custom_authorizer("", authorizer, "", token)
        .with_keep_alive_seconds(1200)
        .build();

    const client = new mqtt.MqttClient();
    const conn = client.new_connection(config);
    connection.value = conn;

    wireHandlers(conn);
    await conn.connect();

    // In case someone queued subs during connect
    processQueuedSubscriptions();
}

async function disconnect() {
    const conn = connection.value;
    connection.value = null;
    status.value = "disconnected";
    reconnecting = false;

    if (!conn) return;

    log.info?.("disconnecting");
    try {
        await conn.disconnect();
    } catch (e) {
        log.warn?.("disconnect_failed_ignored", e);
    }
}

function subscribe(topic: string) {
    const full = finalTopic(topic);

    if (!connection.value || status.value !== "connected") {
        if (!subscriptionQueue.value.includes(topic)) subscriptionQueue.value.push(topic);
        log.debug?.("subscribe_queued", { topic: full });
        return;
    }

    if (subscriptions.value.includes(full)) {
        log.debug?.("subscribe_skipped_already", { topic: full });
        return;
    }

    void connection.value.subscribe(full, mqtt.QoS.AtLeastOnce).then(
        () => {
            subscriptions.value.push(full);
            log.info?.("subscribed", { topic: full });
        },
        (err) => log.error?.("subscribe_failed", { topic: full }, err),
    );
}

function unsubscribe(topic: string) {
    const full = finalTopic(topic);

    subscriptionQueue.value = subscriptionQueue.value.filter((t) => t !== topic);

    if (!connection.value) {
        subscriptions.value = subscriptions.value.filter((t) => t !== full);
        log.debug?.("unsubscribe_no_connection", { topic: full });
        return;
    }

    if (!subscriptions.value.includes(full)) {
        log.debug?.("unsubscribe_skipped_not_subscribed", { topic: full });
        return;
    }

    void connection.value.unsubscribe(full).then(
        () => {
            subscriptions.value = subscriptions.value.filter((t) => t !== full);
            log.info?.("unsubscribed", { topic: full });
        },
        (err) => log.error?.("unsubscribe_failed", { topic: full }, err),
    );
}

function publish(topic: string, payload: unknown) {
    const full = finalTopic(topic);
    if (!connection.value || status.value !== "connected") {
        log.debug?.("publish_skipped_not_connected", { topic: full });
        return;
    }

    const msg = typeof payload === "string" ? payload : JSON.stringify(payload);
    connection.value.publish(full, msg, mqtt.QoS.AtLeastOnce);
    log.debug?.("published", { topic: full });
}

function processQueuedSubscriptions() {
    const queued = [...subscriptionQueue.value];
    subscriptionQueue.value = [];
    if (queued.length) log.debug?.("process_queue", { count: queued.length });
    queued.forEach((t) => subscribe(t));
}

async function reconnect() {
    if (reconnecting) return;
    reconnecting = true;

    const currentSubs = [...subscriptions.value];
    log.warn?.("reconnecting", { subs: currentSubs.length });

    await disconnect();
    await connect();

    currentSubs.forEach((t) => subscribe(t));
    reconnecting = false;
}

export function useRealtime() {
    return {
        status: computed(() => status.value),
        lastError: computed(() => lastError.value),
        isConnected: computed(() => status.value === "connected" && !!connection.value),

        connect,
        disconnect,
        subscribe,
        unsubscribe,
        publish,
    };
}
