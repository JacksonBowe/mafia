import { ref } from 'vue';
import { mqtt, io, iot } from 'aws-iot-device-sdk-v2';
import { useAuthStore } from 'src/stores/auth';
import { useMe } from 'src/lib/user';
import { bus } from 'src/boot/bus';
import { z } from 'zod';

// Define the schema for incoming IoT messages
const iotMessageSchema = z.object({
	type: z.string(),
	properties: z.object({}).passthrough(),
});

// Define the interface for connection arguments
interface WebsocketMQTTArgs {
	endpoint: string;
	region: string;
	aws_access_id: string;
	aws_secret_key: string;
	clientId?: string;
	iotBase?: string;
}

// Define the args globally to reuse
const args: WebsocketMQTTArgs = {
	endpoint: import.meta.env.VITE_IOT_ENDPOINT,
	region: import.meta.env.VITE_APP_REGION,
	aws_access_id: import.meta.env.VITE_IOT_ACCESS_KEY_ID,
	aws_secret_key: import.meta.env.VITE_IOT_SECRET_ACCESS_KEY,
	iotBase: import.meta.env.VITE_IOT_BASE,
};

// Single global connection reference
const connection = ref<mqtt.MqttClientConnection | null>(null);
const subscriptions = ref<string[]>([]);
const subscriptionQueue = ref<string[]>([]);
const pollingInterval = ref<NodeJS.Timeout | null>(null);

// Utility function to build and configure the websocket MQTT connection
function build_websocket_mqtt_connection(
	args: WebsocketMQTTArgs
): mqtt.MqttClientConnection {
	const client_bootstrap = new io.ClientBootstrap();
	const configBuilder =
		iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets();

	configBuilder.with_clean_session(false);
	configBuilder.with_client_id(args.clientId || '');
	configBuilder.with_endpoint(args.endpoint);
	configBuilder.with_will({
		topic: `${args.iotBase}/disconnect`,
		payload: JSON.stringify({ clientId: args.clientId }),
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
	return client.new_connection(config);
}

// Composable to manage the IoT connection and subscriptions
export function useRealtime() {
	const prefix = `mafia/${import.meta.env.VITE_APP_STAGE}/`;

	// Function to establish a connection if none exists
	function connectIoT(userId: string) {
		if (connection.value !== null) {
			console.log('Using existing IoT connection');
			return;
		}

		args.clientId = userId;
		connection.value = build_websocket_mqtt_connection(args);

		// Setup event handlers
		connection.value.on('connect', () => {
			console.log('IoT connection opened');
			stopPolling();
			processQueuedSubscriptions();
		});

		connection.value.on('disconnect', () => {
			console.log('IoT connection disconnected');
		});

		connection.value.on('closed', () => {
			console.log('IoT connection closed');
		});

		connection.value.on('message', (topic, payload) => {
			const rawMsg = JSON.parse(new TextDecoder('utf-8').decode(payload));
			console.log('IoT message received', topic, rawMsg);

			try {
				const msg = iotMessageSchema.parse(rawMsg);
				bus.emit(msg.type as any, msg.properties);
			} catch (e) {
				console.error('Failed to parse message', e);
			}
		});

		connection.value.on('error', (e) => {
			console.log('IoT Error', e);
		});

		console.log('New IoT connection established', connection.value);
		processQueuedSubscriptions();
	}

	function subscribe(topic: string) {
		const finalTopic = `${prefix}${topic}`;

		if (!connection.value) {
			console.log(
				'Connection not ready. Queuing subscription to',
				finalTopic
			);
			subscriptionQueue.value.push(topic);
			return;
		}

		if (!subscriptions.value.includes(finalTopic)) {
			connection.value.subscribe(finalTopic, mqtt.QoS.AtLeastOnce);
			subscriptions.value.push(finalTopic);
			console.log('Subscribed to', finalTopic);
		} else {
			console.log('Already subscribed to', finalTopic);
		}
	}

	function unsubscribe(topic: string) {
		const finalTopic = `${prefix}${topic}`;
		if (connection.value && subscriptions.value.includes(finalTopic)) {
			connection.value.unsubscribe(finalTopic);
			subscriptions.value = subscriptions.value.filter(
				(t) => t !== finalTopic
			);
			console.log('Unsubscribed from', finalTopic);
		} else {
			console.error(
				'Cannot unsubscribe, no connection or not subscribed'
			);
		}
	}

	function processQueuedSubscriptions() {
		subscriptionQueue.value.forEach((topic) => subscribe(topic));
		subscriptionQueue.value = [];
	}

	function startPolling() {
		if (connection.value) {
			console.log('Connection already established, stopping polling.');
			return;
		}

		const aStore = useAuthStore();
		const { data: currentUser } = useMe();
		console.log('Start Polling IoT');

		pollingInterval.value = setInterval(async () => {
			console.log('Polling IoT');
			if (
				currentUser.value &&
				aStore.isAuthenticated &&
				!connection.value
			) {
				connectIoT(currentUser.value.id);
			}
		}, 5000);
	}

	function stopPolling() {
		if (pollingInterval.value) {
			clearInterval(pollingInterval.value);
			pollingInterval.value = null;
			console.log('Polling stopped');
		}
	}

	return {
		connectIoT,
		subscribe,
		unsubscribe,
		startPolling,
		stopPolling,
	};
}
