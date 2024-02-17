import { StackContext } from "sst/constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export function LambdaLayers({ stack }: StackContext) {

    // aws-lambda-powertools
    const powertools = lambda.LayerVersion.fromLayerVersionArn(
        stack, "lambda-powertools", 
        `arn:aws:lambda:${stack.region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:60`
    );

    // requests
    const requests = lambda.LayerVersion.fromLayerVersionArn(
        stack, "requests", 
        `arn:aws:lambda:${stack.region}:770693421928:layer:Klayers-p312-requests:1`
    );

    // pydandic
	const pydantic = new lambda.LayerVersion(stack, "pydantic", {
		code: lambda.Code.fromAsset("packages/functions/layers/pydantic"),
	});


    return {
        powertools,
        requests,
        pydantic
    }
}