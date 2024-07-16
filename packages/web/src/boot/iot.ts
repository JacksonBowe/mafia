import { boot } from 'quasar/wrappers';
import { mqtt, io, iot } from 'aws-iot-device-sdk-v2';
import { useAuthStore } from 'src/stores/auth';
import { useMe } from 'src/lib/composables';

interface WebsocketMQTTArgs {
	endpoint: string;
	region: string;
	aws_access_id: string;
	aws_secret_key: string;
	clientId?: string;
	iotBase?: string;
}

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
	});
	conn.on('disconnect', () => {
		console.log('IoT connection disconnected');
	});
	conn.on('closed', () => {
		console.log('IoT connection closed');
	});
	conn.on('message', (topic, payload, packet) => {
		console.log('IoT message', topic, payload, packet);
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
	// app.config.globalProperties.$IoT = IoT;
	router.afterEach(() => {
		if (!IoT.connection) {
			IoT.startPolling();
		}
	});
});

export { IoT };
