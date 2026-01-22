// src/stores/realtime.ts
import mqtt, { type IClientOptions, type IConnackPacket, type MqttClient } from 'mqtt';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { uid } from 'quasar';
import { bus } from 'src/boot/bus';
import { getLogger } from 'src/lib/log';
import { z } from 'zod';

const log = getLogger('realtime');

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

type ConnectInput = {
	userId: string;
	token: string;
};

type State = {
	connection: MqttClient | null;
	status: ConnectionStatus;
	lastError: unknown;

	subscriptions: Set<string>;
	subscriptionQueue: string[];

	endpoint: string;
	authorizer: string;
	prefix: string;

	clientId: string;
	reconnecting: boolean;
	reconnectAttempt: number;

	userId: string | null;
};

export const RealtimeMessageSchema = z.object({
	type: z.string(),
	properties: z.looseObject({}),
});

// Narrow unknown -> safe log context
function errToCtx(err: unknown): { error: unknown } {
	return { error: err };
}

function decodePayload(payload: unknown): string {
	if (typeof payload === 'string') return payload;
	// mqtt.js in browser typically gives Buffer-like (Uint8Array)
	if (payload instanceof Uint8Array) return new TextDecoder('utf-8').decode(payload);
	// fallback
	try {
		return String(payload);
	} catch {
		return '';
	}
}

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const useRealtime = defineStore('realtime', {
	state: (): State => ({
		connection: null,
		status: 'idle',
		lastError: null,

		subscriptions: new Set(),
		subscriptionQueue: [],

		endpoint: import.meta.env.VITE_REALTIME_ENDPOINT!,
		authorizer: import.meta.env.VITE_REALTIME_AUTHORIZER!,
		prefix: import.meta.env.VITE_REALTIME_PREFIX!,

		clientId: 'client_' + uid(),
		reconnecting: false,
		reconnectAttempt: 0,

		userId: null,
	}),

	getters: {
		isConnected: (s) => s.status === 'connected' && !!s.connection,
	},

	actions: {
		connect(input: ConnectInput) {
			// Idempotency guards
			if (this.status === 'connecting') return;
			if (this.isConnected) return;

			const { token, userId } = input;

			if (!token) {
				log.info('No access token available; not connecting.');
				return;
			}

			this.disconnect();

			this.userId = userId;
			this.status = 'connecting';
			this.lastError = null;

			// unique clientId per connection; include user for debugging
			this.clientId = `user_${userId}_${uid()}`;

			const authorizerName = encodeURIComponent(this.authorizer);
			const url = `wss://${this.endpoint}/mqtt?x-amz-customauthorizer-name=${authorizerName}`;

			log.info('Connecting…', {
				clientId: this.clientId,
				endpoint: this.endpoint,
				authorizer: this.authorizer,
				prefix: this.prefix,
				userId,
			});

			// mqtt.js options for AWS IoT custom authorizer:
			// - protocolVersion 5 (matches SST Next.js example)
			// - username must be empty string
			// - password is treated as your token (your authorizer reads it)
			const options: IClientOptions = {
				protocolVersion: 5,
				manualConnect: true,
				clientId: this.clientId,
				username: '',
				password: 'PLACEHOLDER_TOKEN', // token, // if you truly want placeholder: "PLACEHOLDER_TOKEN"
				reconnectPeriod: 0, // we handle reconnect ourselves
				keepalive: 60, // seconds (mqtt.js uses seconds)
				connectTimeout: 10_000, // ms
				clean: true,
				will: {
					topic: this._finalTopic('$disconnect'),
					payload: JSON.stringify({ clientId: this.clientId, userId }),
					qos: 1,
					retain: false,
				},
			};

			const connection = mqtt.connect(url, options);
			this.connection = connection;

			connection.on('connect', (packet: IConnackPacket) => {
				log.info('WS connected', { clientId: this.clientId, packet });
				this.status = 'connected';
				this.reconnecting = false;
				this._processQueuedSubscriptions();
			});

			connection.on('reconnect', () => {
				// should not happen with reconnectPeriod: 0, but log in case
				log.warn('mqtt.js reconnect event fired unexpectedly');
			});

			connection.on('close', () => {
				log.warn('WS closed');
				if (this.status !== 'disconnected') this.status = 'disconnected';
				void this._reconnect();
			});

			connection.on('offline', () => {
				log.warn('WS offline');
			});

			connection.on('end', () => {
				log.warn('WS ended');
				if (this.status !== 'disconnected') this.status = 'disconnected';
			});

			connection.on('error', (e: unknown) => {
				log.error('WS connection error', { ...errToCtx(e) });
				this.lastError = e;
				this.status = 'error';
				void this._reconnect();
			});

			connection.on('message', (topic: string, payload: unknown) => {
				const text = decodePayload(payload);

				log.debug('Received message', { topic, text });

				try {
					const raw: unknown = JSON.parse(text);
					const msg = RealtimeMessageSchema.parse(raw); // envelope only
					bus.emitFromRealtime(msg.type, msg.properties);
				} catch (err) {
					// keep this as console to avoid recursion if logger depends on realtime
					console.warn('[realtime] Failed to parse realtime message', { topic, text, err });
				}
			});

			// Actually initiate the connection
			try {
				connection.connect();
			} catch (e) {
				log.error('Connect threw synchronously', { ...errToCtx(e) });
				this.lastError = e;
				this.status = 'error';
				void this._reconnect();
			}
		},

		disconnect() {
			const conn = this.connection;
			this.connection = null;
			this.status = 'disconnected';
			this.reconnecting = false;

			if (!conn) return;

			log.info('Disconnecting…');

			try {
				// Force close immediately, don’t keep reconnect timers around.
				conn.end(true);
				log.info('Disconnected');
			} catch (e) {
				log.warn('Disconnect failed (ignored)', { ...errToCtx(e) });
			}
		},

		subscribe(topic: string) {
			const full = this._finalTopic(topic);

			if (!this.connection || this.status !== 'connected') {
				if (!this.subscriptionQueue.includes(topic)) {
					this.subscriptionQueue.push(topic);
				}
				log.debug('Queued subscription', { topic, full });
				return;
			}

			if (this.subscriptions.has(full)) {
				log.debug('Already subscribed', { full });
				return;
			}

			this.connection.subscribe(full, { qos: 1 }, (err) => {
				if (err) {
					log.warn('Subscribe error', { full, ...errToCtx(err) });
					return;
				}
				this.subscriptions.add(full);
				log.info('Subscribed', { full });
			});
		},

		unsubscribe(topic: string) {
			const full = this._finalTopic(topic);

			this.subscriptionQueue = this.subscriptionQueue.filter((t) => t !== topic);

			if (!this.connection || !this.subscriptions.has(full)) {
				this.subscriptions.delete(full);
				log.debug('Not subscribed / not connected', { full });
				return;
			}

			this.connection.unsubscribe(full, (err) => {
				if (err) {
					log.warn('Unsubscribe error', { full, ...errToCtx(err) });
					return;
				}
				this.subscriptions.delete(full);
				log.info('Unsubscribed', { full });
			});
		},

		_finalTopic(topic: string) {
			if (!topic) throw new Error('Topic cannot be empty');

			if (topic.startsWith(this.prefix)) return topic;
			return `${this.prefix}/${topic}`;
		},

		_processQueuedSubscriptions() {
			const queued = [...this.subscriptionQueue];
			this.subscriptionQueue = [];

			log.debug('Processing queued subscriptions', {
				queuedCount: queued.length,
				rememberedCount: this.subscriptions.size,
			});

			queued.forEach((t) => this.subscribe(t));
			for (const full of this.subscriptions) this.subscribe(full);
		},

		async _reconnect() {
			if (this.reconnecting) return;
			if (this.status === 'connecting') return;

			// no user context = nothing to reconnect as
			if (!this.userId) return;

			this.reconnecting = true;

			// simple capped backoff: 0.5s, 1s, 2s, 4s, 8s (cap)
			const attempt = this.reconnectAttempt;
			const delay = Math.min(8000, 500 * Math.pow(2, attempt));

			this.reconnectAttempt = attempt + 1;

			log.warn('Reconnecting…', { attempt: this.reconnectAttempt, delayMs: delay });

			// We can't reconnect without a fresh token; the boot watcher will call connect()
			// when token/userId are present. So we just wait a bit and let the boot watcher re-drive.
			await sleep(delay);

			this.reconnecting = false;
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
