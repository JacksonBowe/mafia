// src/stores/realtime.ts
import { acceptHMRUpdate, defineStore } from "pinia";
import { iot, mqtt } from "aws-iot-device-sdk-v2";
import { z } from "zod";

import { useAuthStore } from "src/stores/auth";
import { bus } from "src/boot/bus";
import { uid } from "quasar";

const iotMessageSchema = z.object({
    type: z.string(),
    properties: z.object({}).passthrough(),
});

type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

type State = {
    connection: mqtt.MqttClientConnection | null;
    status: ConnectionStatus;
    lastError: unknown | null;

    subscriptions: Set<string>;
    subscriptionQueue: string[];

    endpoint: string;
    authorizer: string;
    prefix: string;

    clientId: string;
    reconnecting: boolean;
};

export const useRealtime = defineStore("realtime", {
    state: (): State => ({
        connection: null,
        status: "idle",
        lastError: null,

        subscriptions: new Set(),
        subscriptionQueue: [],

        endpoint: import.meta.env.VITE_REALTIME_ENDPOINT!,
        authorizer: import.meta.env.VITE_REALTIME_AUTHORIZER!,
        prefix: import.meta.env.VITE_REALTIME_PREFIX!,

        clientId: "client_" + uid(),
        reconnecting: false,
    }),

    getters: {
        isConnected: (s) => s.status === "connected" && !!s.connection,
    },

    actions: {
        async connect() {
            const a = useAuthStore();
            const token = a.session?.accessToken;

            if (!token) {
                this._log("No access token available; not connecting.");
                return;
            }

            // If we already have a connection, reset it (matches your old behavior)
            await this.disconnect();

            this.status = "connecting";
            this.lastError = null;

            const config = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets()
                .with_clean_session(false)
                .with_client_id(this.clientId)
                .with_endpoint(this.endpoint)
                // SST Realtime expects custom authorizer + token
                // Signature: with_custom_authorizer(username, authorizerName, password, tokenValue)
                .with_custom_authorizer("", this.authorizer, "", token)
                .with_keep_alive_seconds(1200)
                .build();

            const client = new mqtt.MqttClient();
            const connection = client.new_connection(config);
            this.connection = connection;

            connection.on("connect", () => {
                this._log("WS connected");
                this.status = "connected";
                this.reconnecting = false;
                this._processQueuedSubscriptions();
            });

            connection.on("interrupt", (e) => {
                this._log("interrupted", e, JSON.stringify(e));
                // Keep it simple for Stage 1:
                // do a best-effort reconnect, and rely on queued+subscriptions set
                this._reconnect();
            });

            connection.on("resume", (...args) => this._log("resume", ...args));

            connection.on("disconnect", (...args) => {
                this._log("disconnect", ...args);
                if (this.status !== "disconnected") this.status = "disconnected";
            });

            connection.on("closed", (...args) => {
                this._log("closed", ...args);
                if (this.status !== "disconnected") this.status = "disconnected";
            });

            connection.on("error", (e) => {
                this._log("connection error", e);
                this.lastError = e;
                this.status = "error";
            });

            connection.on("message", (topic, payload) => {
                const text = new TextDecoder("utf-8").decode(new Uint8Array(payload));
                try {
                    const raw = JSON.parse(text);
                    const msg = iotMessageSchema.parse(raw);
                    this._log("message", topic, msg);

                    // Same pattern as your old code
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    bus.emit(msg.type as any, msg.properties);
                } catch (err) {
                    this._log("Failed to parse message", topic, text, err);
                }
            });

            await connection.connect();
        },

        async disconnect() {
            const conn = this.connection;
            this.connection = null;
            this.status = "disconnected";
            this.reconnecting = false;

            if (!conn) return;

            try {
                await conn.disconnect();
            } catch (e) {
                this._log("disconnect failed (ignored)", e);
            }
        },

        subscribe(topic: string) {
            const full = this._finalTopic(topic);

            if (!this.connection || this.status !== "connected") {
                if (!this.subscriptionQueue.includes(topic)) {
                    this.subscriptionQueue.push(topic);
                }
                this._log("Queued subscription", full);
                return;
            }

            if (this.subscriptions.has(full)) {
                this._log("Already subscribed", full);
                return;
            }

            // Note: aws-iot-device-sdk-v2 subscribe returns a Promise in many versions,
            // but some builds allow sync. We'll treat it as async best-effort.
            void this.connection.subscribe(full, mqtt.QoS.AtLeastOnce).then(
                () => {
                    this.subscriptions.add(full);
                    this._log("Subscribed", full);
                },
                (err) => this._log("Subscribe error", full, err),
            );
        },

        unsubscribe(topic: string) {
            const full = this._finalTopic(topic);

            // remove from queue too
            this.subscriptionQueue = this.subscriptionQueue.filter((t) => t !== topic);

            if (!this.connection || !this.subscriptions.has(full)) {
                this.subscriptions.delete(full);
                this._log("Not subscribed / not connected", full);
                return;
            }

            void this.connection.unsubscribe(full).then(
                () => {
                    this.subscriptions.delete(full);
                    this._log("Unsubscribed", full);
                },
                (err) => this._log("Unsubscribe error", full, err),
            );
        },

        publish(topic: string, payload: unknown) {
            const full = this._finalTopic(topic);

            if (!this.connection || this.status !== "connected") {
                this._log("Cannot publish (not connected)", full);
                return;
            }

            const message = typeof payload === "string" ? payload : JSON.stringify(payload);
            this.connection.publish(full, message, mqtt.QoS.AtLeastOnce);
        },

        // --- internal helpers ---

        _finalTopic(topic: string) {
            if (topic.startsWith(this.prefix)) return topic;
            return `${this.prefix}${topic}`;
        },

        _processQueuedSubscriptions() {
            const queued = [...this.subscriptionQueue];
            this.subscriptionQueue = [];
            queued.forEach((t) => this.subscribe(t));

            // Optional: also re-subscribe to remembered subscriptions after reconnect
            // (subscriptions are stored as full topics; subscribe() accepts either)
            for (const full of this.subscriptions) this.subscribe(full);
        },

        async _reconnect() {
            if (this.reconnecting) return;
            this.reconnecting = true;

            // Snapshot current subscriptions (full topics)
            const topics = Array.from(this.subscriptions);

            // Reset local state but keep subscriptions set
            await this.disconnect();

            // Attempt fresh connect (will also process queue)
            await this.connect();

            // Re-subscribe after reconnect (subscribe() de-dupes)
            topics.forEach((t) => this.subscribe(t));
        },

        _log(...args: unknown[]) {
            // eslint-disable-next-line no-console
            console.log("[realtime]", ...args);
        },
    },
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useRealtime, import.meta.hot));
    import.meta.hot.dispose(() => {
        try {
            const s = useRealtime();
            void s.disconnect();
        } catch {
            // ignore
        }
    });
}
