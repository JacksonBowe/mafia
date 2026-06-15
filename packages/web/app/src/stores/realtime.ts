// src/stores/realtime.ts
import mqtt, { type IClientOptions, type IConnackPacket, type MqttClient } from 'mqtt';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { uid } from 'quasar';
import { bus } from 'src/boot/bus';
import { getLogger } from 'src/lib/log';
import { z } from 'zod';

const log = getLogger('realtime');

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
export type RealtimeConnectionKey = 'menu' | `game:${string}`;
export type RealtimeCredential =
	| { scope: 'menu'; token: string; userId: string }
	| { scope: 'game'; token: string; userId: string; gameId: string };

type ConnectionState = {
	connection: MqttClient | null;
	status: ConnectionStatus;
	lastError: unknown;
	subscriptions: Set<string>;
	subscriptionQueue: string[];
	clientId: string;
	reconnecting: boolean;
	reconnectAttempt: number;
	credential: RealtimeCredential | null;
};

type State = {
	connections: Record<string, ConnectionState>;
	endpoint: string;
	authorizer: string;
	prefix: string;
};

export const RealtimeMessageSchema = z.object({
	type: z.string(),
	properties: z.looseObject({}),
});

function createConnectionState(): ConnectionState {
	return {
		connection: null,
		status: 'idle',
		lastError: null,
		subscriptions: new Set(),
		subscriptionQueue: [],
		clientId: 'client_' + uid(),
		reconnecting: false,
		reconnectAttempt: 0,
		credential: null,
	};
}

function errToCtx(err: unknown): { error: unknown } {
	return { error: err };
}

function decodePayload(payload: unknown): string {
	if (typeof payload === 'string') return payload;
	if (payload instanceof Uint8Array) return new TextDecoder('utf-8').decode(payload);
	try {
		return String(payload);
	} catch {
		return '';
	}
}

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function keyForCredential(credential: RealtimeCredential): RealtimeConnectionKey {
	return credential.scope === 'menu' ? 'menu' : `game:${credential.gameId}`;
}

function clientIdFor(key: RealtimeConnectionKey, credential: RealtimeCredential) {
	const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
	return `${safeKey}_${credential.userId}_${uid()}`;
}

export const useRealtime = defineStore('realtime', {
	state: (): State => ({
		connections: {},
		endpoint: import.meta.env.VITE_REALTIME_ENDPOINT!,
		authorizer: import.meta.env.VITE_REALTIME_AUTHORIZER!,
		prefix: import.meta.env.VITE_REALTIME_PREFIX!,
	}),

	getters: {
		isConnected:
			(s) =>
			(key: RealtimeConnectionKey = 'menu'): boolean =>
				s.connections[key]?.status === 'connected' && !!s.connections[key]?.connection,
		status:
			(s) =>
			(key: RealtimeConnectionKey = 'menu'): ConnectionStatus =>
				s.connections[key]?.status ?? 'idle',
	},

	actions: {
		stateFor(key: RealtimeConnectionKey) {
			this.connections[key] ??= createConnectionState();
			return this.connections[key];
		},

		connect(credential: RealtimeCredential) {
			const key = keyForCredential(credential);
			const state = this.stateFor(key);

			if (state.status === 'connecting') return;
			if (state.status === 'connected' && state.connection) return;

			if (!credential.token) {
				log.info('No access token available; not connecting.', { key });
				return;
			}

			this.disconnect(key);

			state.credential = credential;
			state.status = 'connecting';
			state.lastError = null;
			state.clientId = clientIdFor(key, credential);

			const authorizerName = encodeURIComponent(this.authorizer);
			const url = `wss://${this.endpoint}/mqtt?x-amz-customauthorizer-name=${authorizerName}`;

			log.info('Connecting...', {
				key,
				clientId: state.clientId,
				endpoint: this.endpoint,
				authorizer: this.authorizer,
				prefix: this.prefix,
				userId: credential.userId,
			});

			const options: IClientOptions = {
				protocolVersion: 5,
				manualConnect: true,
				clientId: state.clientId,
				username: '',
				password: JSON.stringify(credential),
				reconnectPeriod: 0,
				keepalive: 60,
				connectTimeout: 10_000,
				clean: true,
				will: {
					topic: this._finalTopic(key, this._disconnectTopic(credential)),
					payload: JSON.stringify({ clientId: state.clientId, userId: credential.userId }),
					qos: 1,
					retain: false,
				},
			};

			const connection = mqtt.connect(url, options);
			state.connection = connection;

			connection.on('connect', (packet: IConnackPacket) => {
				log.info('WS connected', { key, clientId: state.clientId, packet });
				state.status = 'connected';
				state.reconnecting = false;
				state.reconnectAttempt = 0;
				this._processQueuedSubscriptions(key);
			});

			connection.on('reconnect', () => {
				log.warn('mqtt.js reconnect event fired unexpectedly', { key });
			});

			connection.on('close', () => {
				log.warn('WS closed', { key });
				if (state.status !== 'disconnected') state.status = 'disconnected';
				void this._reconnect(key);
			});

			connection.on('offline', () => {
				log.warn('WS offline', { key });
			});

			connection.on('end', () => {
				log.warn('WS ended', { key });
				if (state.status !== 'disconnected') state.status = 'disconnected';
			});

			connection.on('error', (e: unknown) => {
				log.error('WS connection error', { key, ...errToCtx(e) });
				state.lastError = e;
				state.status = 'error';
				void this._reconnect(key);
			});

			connection.on('message', (topic: string, payload: unknown) => {
				const text = decodePayload(payload);

				log.debug('Received message', { key, topic, text });

				try {
					const raw: unknown = JSON.parse(text);
					const msg = RealtimeMessageSchema.parse(raw);
					bus.emitFromRealtime(msg.type, msg.properties);
				} catch (err) {
					console.warn('[realtime] Failed to parse realtime message', { key, topic, text, err });
				}
			});

			try {
				connection.connect();
			} catch (e) {
				log.error('Connect threw synchronously', { key, ...errToCtx(e) });
				state.lastError = e;
				state.status = 'error';
				void this._reconnect(key);
			}
		},

		disconnect(key: RealtimeConnectionKey = 'menu', clear = false) {
			const state = this.connections[key];
			if (!state) return;

			const conn = state.connection;
			state.connection = null;
			state.status = 'disconnected';
			state.reconnecting = false;
			if (clear) {
				state.subscriptions.clear();
				state.subscriptionQueue = [];
				state.credential = null;
			}

			if (!conn) return;

			log.info('Disconnecting...', { key });

			try {
				conn.end(true);
				log.info('Disconnected', { key });
			} catch (e) {
				log.warn('Disconnect failed (ignored)', { key, ...errToCtx(e) });
			}
		},

		disconnectAll() {
			for (const key of Object.keys(this.connections)) {
				this.disconnect(key as RealtimeConnectionKey, true);
			}
		},

		subscribe(key: RealtimeConnectionKey, topic: string) {
			const state = this.stateFor(key);
			const full = this._finalTopic(key, topic);

			if (!state.connection || state.status !== 'connected') {
				if (!state.subscriptionQueue.includes(topic)) {
					state.subscriptionQueue.push(topic);
				}
				log.debug('Queued subscription', { key, topic, full });
				return;
			}

			if (state.subscriptions.has(full)) {
				log.debug('Already subscribed', { key, full });
				return;
			}

			state.connection.subscribe(full, { qos: 1 }, (err) => {
				if (err) {
					log.warn('Subscribe error', { key, full, ...errToCtx(err) });
					return;
				}
				state.subscriptions.add(full);
				log.info('Subscribed', { key, full });
			});
		},

		unsubscribe(key: RealtimeConnectionKey, topic: string) {
			const state = this.stateFor(key);
			const full = this._finalTopic(key, topic);

			state.subscriptionQueue = state.subscriptionQueue.filter((t) => t !== topic);

			if (!state.connection || !state.subscriptions.has(full)) {
				state.subscriptions.delete(full);
				log.debug('Not subscribed / not connected', { key, full });
				return;
			}

			state.connection.unsubscribe(full, (err) => {
				if (err) {
					log.warn('Unsubscribe error', { key, full, ...errToCtx(err) });
					return;
				}
				state.subscriptions.delete(full);
				log.info('Unsubscribed', { key, full });
			});
		},

		_finalTopic(_key: RealtimeConnectionKey, topic: string) {
			if (!topic) throw new Error('Topic cannot be empty');

			if (topic.startsWith(this.prefix)) return topic;
			return `${this.prefix}/${topic}`;
		},

		_disconnectTopic(credential: RealtimeCredential) {
			if (credential.scope === 'game') return `game/${credential.gameId}/$disconnect`;
			return 'menu/$disconnect';
		},

		_processQueuedSubscriptions(key: RealtimeConnectionKey) {
			const state = this.stateFor(key);
			const queued = [...state.subscriptionQueue];
			state.subscriptionQueue = [];

			log.debug('Processing queued subscriptions', {
				key,
				queuedCount: queued.length,
				rememberedCount: state.subscriptions.size,
			});

			queued.forEach((t) => this.subscribe(key, t));
			for (const full of state.subscriptions) this._subscribeNow(key, full);
		},

		_subscribeNow(key: RealtimeConnectionKey, full: string) {
			const state = this.stateFor(key);
			if (!state.connection || state.status !== 'connected') return;
			state.connection.subscribe(full, { qos: 1 }, (err) => {
				if (err) {
					log.warn('Subscribe error', { key, full, ...errToCtx(err) });
					return;
				}
				state.subscriptions.add(full);
				log.info('Subscribed', { key, full });
			});
		},

		async _reconnect(key: RealtimeConnectionKey) {
			const state = this.stateFor(key);
			if (state.reconnecting) return;
			if (state.status === 'connecting') return;
			if (!state.credential) return;

			state.reconnecting = true;

			const attempt = state.reconnectAttempt;
			const delay = Math.min(8000, 500 * Math.pow(2, attempt));

			state.reconnectAttempt = attempt + 1;

			log.warn('Reconnecting...', { key, attempt: state.reconnectAttempt, delayMs: delay });

			await sleep(delay);
			state.reconnecting = false;
			if (state.status !== 'connected' && state.credential) {
				this.connect(state.credential);
			}
		},
	},
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useRealtime, import.meta.hot));
	import.meta.hot.dispose(() => {
		try {
			const s = useRealtime();
			void s.disconnectAll();
		} catch {
			// ignore
		}
	});
}
