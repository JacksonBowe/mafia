import { StackContext } from "sst/constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export function LambdaLayers({ stack }: StackContext) {
    const powertools = lambda.LayerVersion.fromLayerVersionArn(
        stack, "lambda-powertools", 
        `arn:aws:lambda:${stack.region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:60`)

    const requests = lambda.LayerVersion.fromLayerVersionArn(
        stack, "requests", 
        `arn:aws:lambda:${stack.region}:770693421928:layer:Klayers-p312-requests:1`)

        return {
            powertools,
            requests
        }
}