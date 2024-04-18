import { StackContext, Topic, use } from "sst/constructs";
import { useIOTEndpoint } from "sst/iot.js";
import { Storage } from "./Storage";

import * as iot from "@aws-cdk/aws-iot-alpha";
import * as actions from "@aws-cdk/aws-iot-actions-alpha";
import * as iam from "aws-cdk-lib/aws-iam";

export async function IoT({ app, stack }: StackContext) {
	const { userTable, lobbyTable } = use(Storage);

	// IoT Endpoint
	let iotEndpoint = "";
	await useIOTEndpoint().then((result) => {
		iotEndpoint = result;
	});

	// Create an IAM user to interact with the IoT Core
	const iotUser = new iam.User(stack, "IotUser", {
		userName: `${app.name}-${app.stage}-iot-user`,
	});

	// Attach the necessary policies to the user
	iotUser.addToPolicy(
		new iam.PolicyStatement({
			actions: [
				"iot:Connect",
				"iot:Subscribe",
				"iot:Receive",
				// No publish permission
			],
			resources: [`arn:aws:iot:${stack.region}:${stack.account}:topic/${app.name}/${app.stage}/*`],
			effect: iam.Effect.ALLOW,
		})
	);

	// Disconnect Event
	iotUser.addToPolicy(
		new iam.PolicyStatement({
			resources: [`arn:aws:iot:${stack.region}:${stack.account}:topic/${app.name}/${app.stage}/disconnect`],
			actions: ["iot:Publish"],
			effect: iam.Effect.ALLOW,
		})
	);

	// Create the IoT Topic
	const topic = new Topic(stack, "IoTDisconnectTopic", {
		subscribers: {
			disconnect: "packages/functions/events/iot.disconnect",
		},
		defaults: {
			function: {
				environment: {
					APP_USER_TABLE_NAME: userTable.tableName,
					APP_LOBBY_TABLE_NAME: lobbyTable.tableName,
				},
				bind: [userTable, lobbyTable],
				permissions: ["iot:Publish"],
			},
		},
	});

	const topicRule = new iot.TopicRule(stack, "IoTDisconnectRule", {
		topicRuleName: `${app.name}_${app.stage}_iot_disconnect`,
		description: "Handle IoT Core disconnect events",
		sql: iot.IotSql.fromStringAsVer20160323(`SELECT * FROM '${app.name}/${app.stage}/disconnect'`),
		actions: [new actions.SnsTopicAction(topic.cdk.topic)],
	});

	stack.addOutputs({
		IoTEndpoint: iotEndpoint,
	});

	return {
		iotUser,
		iotEndpoint,
		topic,
		topicRule,
	};
}
