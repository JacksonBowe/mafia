// src/stores/realtime.ts
import { iot, mqtt } from "aws-iot-device-sdk-v2";
import { acceptHMRUpdate, defineStore } from "pinia";

import { uid } from "quasar";
import { bus } from "src/boot/bus";
import { useAuthStore } from "src/stores/auth";

import { RealtimeMessageSchema } from "@mafia/core/realtime/index";
import { getLogger } from "src/lib/log";

const log = getLogger("realtime");

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

// Narrow unknown -> safe log context
function errToCtx(err: unknown): { error: unknown } {
    return { error: err };
}

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
                log.info("No access token available; not connecting.");
                return;
            }

            await this.disconnect();

            this.status = "connecting";
            this.lastError = null;

            log.info("Connecting…", {
                clientId: this.clientId,
                endpoint: this.endpoint,
                authorizer: this.authorizer,
                prefix: this.prefix,
            });

            const config = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets()
                .with_clean_session(false)
                .with_client_id(this.clientId)
                .with_endpoint(this.endpoint)
                .with_custom_authorizer("", this.authorizer, "", token)
                .with_keep_alive_seconds(1200)
                .build();

            const client = new mqtt.MqttClient();
            const connection = client.new_connection(config);
            this.connection = connection;

            connection.on("connect", () => {
                log.info("WS connected", { clientId: this.clientId });
                this.status = "connected";
                this.reconnecting = false;
                this._processQueuedSubscriptions();
            });

            connection.on("interrupt", (e) => {
                // interrupt isn't "info" in practice; it's a warning signal
                log.warn("WS interrupted; will attempt reconnect", { ...errToCtx(e) });
                this._reconnect();
            });

            connection.on("resume", (...args: unknown[]) => {
                log.info("WS resumed", { args });
            });

            connection.on("disconnect", (...args: unknown[]) => {
                log.warn("WS disconnected", { args });
                if (this.status !== "disconnected") this.status = "disconnected";
            });

            connection.on("closed", (...args: unknown[]) => {
                log.warn("WS closed", { args });
                if (this.status !== "disconnected") this.status = "disconnected";
            });

            connection.on("error", (e) => {
                log.error("WS connection error", { ...errToCtx(e) });
                this.lastError = e;
                this.status = "error";
            });

            connection.on("message", (topic, payload) => {
                const text = new TextDecoder("utf-8").decode(new Uint8Array(payload));

                try {
                    const raw: unknown = JSON.parse(text);
                    const msg = RealtimeMessageSchema.parse(raw);

                    log.debug("Message received", { topic, type: msg.type });

                    // Avoid `any`: emit via a safe string event name.
                    // If you want typing, we can add a typed wrapper for bus.emit later.
                    bus.emit(String(msg.type), msg.properties);
                } catch (err) {
                    log.warn("Failed to parse realtime message", {
                        topic,
                        text,
                        ...errToCtx(err),
                    });
                }
            });

            try {
                await connection.connect();
            } catch (e) {
                log.error("Connect failed", { ...errToCtx(e) });
                this.lastError = e;
                this.status = "error";
                throw e;
            }
        },

        async disconnect() {
            const conn = this.connection;
            this.connection = null;
            this.status = "disconnected";
            this.reconnecting = false;

            if (!conn) return;

            log.info("Disconnecting…");

            try {
                await conn.disconnect();
                log.info("Disconnected");
            } catch (e) {
                log.warn("Disconnect failed (ignored)", { ...errToCtx(e) });
            }
        },

        subscribe(topic: string) {
            const full = this._finalTopic(topic);

            if (!this.connection || this.status !== "connected") {
                if (!this.subscriptionQueue.includes(topic)) {
                    this.subscriptionQueue.push(topic);
                }
                log.debug("Queued subscription", { topic, full });
                return;
            }

            if (this.subscriptions.has(full)) {
                log.debug("Already subscribed", { full });
                return;
            }

            void this.connection.subscribe(full, mqtt.QoS.AtLeastOnce).then(
                () => {
                    this.subscriptions.add(full);
                    log.info("Subscribed", { full });
                },
                (err) => log.warn("Subscribe error", { full, ...errToCtx(err) }),
            );
        },

        unsubscribe(topic: string) {
            const full = this._finalTopic(topic);

            this.subscriptionQueue = this.subscriptionQueue.filter((t) => t !== topic);

            if (!this.connection || !this.subscriptions.has(full)) {
                this.subscriptions.delete(full);
                log.debug("Not subscribed / not connected", { full });
                return;
            }

            void this.connection.unsubscribe(full).then(
                () => {
                    this.subscriptions.delete(full);
                    log.info("Unsubscribed", { full });
                },
                (err) => log.warn("Unsubscribe error", { full, ...errToCtx(err) }),
            );
        },

        publish(topic: string, payload: unknown) {
            const full = this._finalTopic(topic);

            if (!this.connection || this.status !== "connected") {
                log.debug("Cannot publish (not connected)", { full });
                return;
            }

            const message = typeof payload === "string" ? payload : JSON.stringify(payload);
            this.connection.publish(full, message, mqtt.QoS.AtLeastOnce);

            log.trace("Published", { full });
        },

        _finalTopic(topic: string) {
            if (topic.startsWith(this.prefix)) return topic;
            return `${this.prefix}${topic}`;
        },

        _processQueuedSubscriptions() {
            const queued = [...this.subscriptionQueue];
            this.subscriptionQueue = [];

            log.debug("Processing queued subscriptions", {
                queuedCount: queued.length,
                rememberedCount: this.subscriptions.size,
            });

            queued.forEach((t) => this.subscribe(t));

            for (const full of this.subscriptions) this.subscribe(full);
        },

        async _reconnect() {
            if (this.reconnecting) return;
            this.reconnecting = true;

            log.warn("Reconnecting…");

            const topics = Array.from(this.subscriptions);

            await this.disconnect();
            await this.connect();

            topics.forEach((t) => this.subscribe(t));

            log.info("Reconnect finished", { topics: topics.length });
        },

        // You can delete this now — it was the pre-wrapper console logger
        // _log(...args: unknown[]) {
        //   // eslint-disable-next-line no-console
        //   console.log("[realtime]", ...args);
        // },
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
