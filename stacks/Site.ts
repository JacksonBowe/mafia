import { StackContext, StaticSite, use } from "sst/constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { API } from "./Api";
import { IoT } from "./IoT";

export function Site({ stack }: StackContext) {
	const { api } = use(API);
	const { iotUser, iotEndpoint } = use(IoT);

	// Get the users access tokens
	const accessKey = new iam.AccessKey(stack, "iotAccessKey", { user: iotUser });

	const site = new StaticSite(stack, "site", {
		path: "packages/web/",
		buildOutput: "dist/spa",
		buildCommand: "npm ci && npm run build",
		errorPage: "index.html",
		environment: {
			VITE_API_URL: api.url,
			VITE_REGION: stack.region,
			VITE_IOT_ENDPOINT: iotEndpoint,
			VITE_IOT_ACCESS_KEY_ID: accessKey.accessKeyId,
			VITE_IOT_SECRET_ACCESS_KEY: accessKey.secretAccessKey.toString(),
		},
		cdk: {
			bucket: {
				removalPolicy: RemovalPolicy.DESTROY,
			},
		},
	});

	stack.addOutputs({
		SiteUrl: site.url || "http://localhost:9000",
		iotUser: iotUser.userName || "No user",
	});
}
