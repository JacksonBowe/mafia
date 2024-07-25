import { mqtt } from 'aws-iot-device-sdk-v2';

const init = (conn: mqtt.MqttClientConnection) => {
	console.log('Realtime init');

	conn.subscribe('test', mqtt.QoS.AtLeastOnce, (topic, payload, packet) => {
		console.log('Received message:', topic, payload.toString());
	});
};

export default { init };
