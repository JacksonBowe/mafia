import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// MQTT realtime client for bots.
//
// This mirrors the web app's realtime store (packages/web/app/src/stores/
// realtime.ts). The key difference: bots authenticate with a static API key
// instead of an expiring access token, so we let mqtt.js handle reconnects
// (reconnectPeriod > 0) rather than re-driving connect ourselves.
// ---------------------------------------------------------------------------

const RealtimeMessageSchema = z.object({
	type: z.string(),
	properties: z.looseObject({}),
});
export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>;

export type BotRealtimeOptions = {
	endpoint: string;
	authorizer: string;
	prefix: string;
	apiKey: string;
	userId: string;
	scope: 'menu' | 'game';
	gameId?: string;
	clientId: string;
	label: string;
	onMessage: (msg: RealtimeMessage, topic: string) => void;
	onStatus?: (message: string) => void;
	onError?: (err: unknown) => void;
};

export class BotRealtime {
	private client: MqttClient | null = null;
	private readonly subscriptions = new Set<string>();
	private readonly opts: BotRealtimeOptions;

	constructor(opts: BotRealtimeOptions) {
		this.opts = opts;
	}

	private log(msg: string, extra?: unknown): void {
		if (this.opts.onStatus) {
			this.opts.onStatus(msg);
			return;
		}
		if (extra !== undefined) console.log(`[${this.opts.label}] ${msg}`, extra);
		else console.log(`[${this.opts.label}] ${msg}`);
	}

	private error(err: unknown): void {
		this.opts.onError?.(err);
		this.log('connection error', err);
	}

	/** Prefix a topic with the app/stage namespace unless already prefixed. */
	private full(topic: string): string {
		if (topic.startsWith(this.opts.prefix)) return topic;
		return `${this.opts.prefix}/${topic}`;
	}

	/** Connect and resolve once the first CONNACK arrives (rejects on first error). */
	connect(): Promise<void> {
		const { endpoint, authorizer, apiKey, userId, scope, gameId, clientId } = this.opts;
		const authorizerName = encodeURIComponent(authorizer);
		const url = `wss://${endpoint}/mqtt?x-amz-customauthorizer-name=${authorizerName}`;
		if (scope === 'game' && !gameId) throw new Error('Game realtime connection requires gameId');
		const credential =
			scope === 'game' ? { scope, token: apiKey, userId, gameId } : { scope, token: apiKey, userId };

		const options: IClientOptions = {
			protocolVersion: 5,
			// Bun's `ws` shim doesn't implement `ws.createWebSocketStream()`, which
			// mqtt.js uses on its Node path. Force the native WebSocket transport
			// (Bun has a global `WebSocket`) so we skip that unsupported codepath.
			forceNativeWebSocket: true,
			clientId,
			username: '',
			password: JSON.stringify(credential),
			reconnectPeriod: 2000,
			keepalive: 60,
			connectTimeout: 10_000,
			clean: true,
			will: {
				topic: this.full(scope === 'game' ? `game/${gameId}/$disconnect` : 'menu/$disconnect'),
				payload: JSON.stringify({ clientId, userId }),
				qos: 1,
				retain: false,
			},
		};

		const client = mqtt.connect(url, options);
		this.client = client;

		client.on('connect', () => {
			this.log('connected');
			// (Re)subscribe to everything we care about on every (re)connect.
			for (const full of this.subscriptions) {
				client.subscribe(full, { qos: 1 });
			}
		});
		client.on('reconnect', () => this.log('reconnecting…'));
		client.on('close', () => this.log('connection closed'));
		client.on('error', (e: unknown) => this.error(e));

		client.on('message', (topic: string, payload: Buffer) => {
			const text = payload.toString('utf-8');
			try {
				const raw: unknown = JSON.parse(text);
				const msg = RealtimeMessageSchema.parse(raw);
				this.opts.onMessage(msg, topic);
			} catch (err) {
				this.log('failed to parse message', { topic, text, err });
			}
		});

		return new Promise<void>((resolve, reject) => {
			client.once('connect', () => resolve());
			client.once('error', (e: unknown) =>
				reject(e instanceof Error ? e : new Error(String(e))),
			);
		});
	}

	subscribe(topic: string): void {
		const full = this.full(topic);
		if (this.subscriptions.has(full)) return;
		this.subscriptions.add(full);

		this.client?.subscribe(full, { qos: 1 }, (err) => {
			if (err) this.log('subscribe error', { full, err });
			else this.log(`subscribed ${full}`);
		});
	}

	unsubscribe(topic: string): void {
		const full = this.full(topic);
		this.subscriptions.delete(full);
		this.client?.unsubscribe(full);
	}

	disconnect(): void {
		this.client?.end(true);
		this.client = null;
	}
}
