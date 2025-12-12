import { StackContext } from "sst/constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export function LambdaLayers({ app, stack }: StackContext) {
    // aws-lambda-powertools
    const powertools = lambda.LayerVersion.fromLayerVersionArn(
        stack,
        "lambda-powertools",
        `arn:aws:lambda:${stack.region}:017000801446:layer:AWSLambdaPowertoolsPythonV3-python312-x86_64:5`
    );

    // requests
    const requests = lambda.LayerVersion.fromLayerVersionArn(
        stack,
        "requests",
        `arn:aws:lambda:${stack.region}:770693421928:layer:Klayers-p312-requests:1`
    );

    // python-jose
    const jose = new lambda.LayerVersion(stack, "python-jose", {
        code: lambda.Code.fromAsset("packages/functions/layers/python-jose"),
    });

    app.addDefaultFunctionLayers([powertools]);

    return {
        powertools,
        requests,
        jose,
    };
}
