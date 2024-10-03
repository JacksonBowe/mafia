import { boot } from 'quasar/wrappers';
import { mqtt, io, iot } from 'aws-iot-device-sdk-v2';
import { useAuthStore } from 'src/stores/auth';
import { useMe } from 'src/lib/user';
import { bus } from './bus';
import { z } from 'zod';

interface WebsocketMQTTArgs {
	endpoint: string;
	region: string;
	aws_access_id: string;
	aws_secret_key: string;
	clientId?: string;
	iotBase?: string;
}

const iotMessageSchema = z.object({
	type: z.string(),
	properties: z.object({}).passthrough(),
});

function build_websocket_mqtt_connection(args: WebsocketMQTTArgs) {
	const client_bootstrap = new io.ClientBootstrap();
	const configBuilder =
		iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets();
	configBuilder.with_clean_session(false);
	configBuilder.with_client_id(args.clientId || '');
	configBuilder.with_endpoint(args.endpoint);
	configBuilder.with_will({
		topic: `${args.iotBase}/disconnect`,
		payload: JSON.stringify({
			clientId: args.clientId,
		}),
		qos: mqtt.QoS.AtLeastOnce,
		retain: false,
	});
	configBuilder.with_credentials(
		args.region,
		args.aws_access_id,
		args.aws_secret_key
	);
	const config = configBuilder.build();
	const client = new mqtt.MqttClient(client_bootstrap);
	const conn = client.new_connection(config);
	conn.on('connect', () => {
		console.log('IoT connection opened');
		IoT.stopPolling();

		// IoT.subscribe('test');
	});
	conn.on('disconnect', () => {
		console.log('IoT connection disconnected');
	});
	conn.on('closed', () => {
		console.log('IoT connection closed');
	});
	conn.on('message', (topic, payload) => {
		const rawMsg = JSON.parse(new TextDecoder('utf-8').decode(payload));
		console.log('IoT message', topic, rawMsg);

		try {
			const msg = iotMessageSchema.parse(rawMsg);
			bus.emit(msg.type as any, msg.properties);
		} catch (e) {
			console.error('Failed to parse message', e);
			// TODO: Notify here when receiving malformed IoT messages
			return;
		}
	});
	conn.on('error', (e) => {
		console.log('IoT Error', e);
	});
	return conn;
}

const args: WebsocketMQTTArgs = {
	endpoint: import.meta.env.VITE_IOT_ENDPOINT,
	region: import.meta.env.VITE_APP_REGION,
	aws_access_id: import.meta.env.VITE_IOT_ACCESS_KEY_ID,
	aws_secret_key: import.meta.env.VITE_IOT_SECRET_ACCESS_KEY,
	iotBase: import.meta.env.VITE_IOT_BASE,
};

const IoT = {
	mqtt: mqtt,
	connection: null as mqtt.MqttClientConnection | null,
	prefix: `mafia/${import.meta.env.VITE_APP_STAGE}/`,
	subscriptions: [] as string[],
	subscribe(topic: string) {
		const finalTopic = `${this.prefix}${topic}`;

		if (!this.connection) {
			console.error('No IoT connection');
			return;
		}
		if (this.subscriptions.includes(finalTopic)) {
			console.log('Already subscribed to', finalTopic);
			this.unsubscribe(topic);
		}
		this.connection?.subscribe(finalTopic, mqtt.QoS.AtLeastOnce);
		this.subscriptions.push(finalTopic);
		console.log('Subscribed to', finalTopic);
	},
	unsubscribe(topic: string) {
		const finalTopic = `${this.prefix}${topic}`;
		if (!this.connection) {
			console.error('No IoT connection');
			return;
		}

		this.connection?.unsubscribe(finalTopic);
		this.subscriptions = this.subscriptions.filter((t) => t !== finalTopic);
		console.log('Unsubscribed from', finalTopic);
	},
	async connectIoT(userId: string) {
		if (IoT.connection !== null) return;
		args.clientId = userId;
		IoT.connection = build_websocket_mqtt_connection(args);
		console.log('Connection', IoT.connection);
	},
	pollingInterval: null as NodeJS.Timeout | null,
	startPolling() {
		const aStore = useAuthStore();
		const { data: currentUser } = useMe();
		console.log('Start Polling IoT');
		this.pollingInterval = setInterval(async () => {
			console.log('Polling IoT');
			if (
				currentUser.value &&
				aStore.isAuthenticated &&
				!this.connection
			) {
				this.connectIoT(currentUser.value.id);
			}
		}, 5000);
	},
	stopPolling() {
		if (this.pollingInterval) {
			console.log('Stop Polling IoT');
			clearInterval(this.pollingInterval);
			this.pollingInterval = null;
		}
	},
};

export default boot(async ({ router }) => {
	router.afterEach((to) => {
		if (to.meta.requiresAuth === false) {
			IoT.stopPolling();
			return;
		}
		if (!IoT.connection) {
			IoT.startPolling();
		}
	});
});

export { IoT };
