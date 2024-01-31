import { StackContext, StaticSite, use } from "sst/constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import { MApi } from "./Api";

export function MSite({ stack }: StackContext) {
    const { api } = use(MApi)

    const site = new StaticSite(stack, 'site', {
        path: 'packages/web/',
        buildOutput: 'dist/spa',
        buildCommand: 'npm ci && npm run build',
        errorPage: 'index.html',
        environment: {
            VITE_API_ENDPOINT: api.url
        },
        cdk: {
            bucket: {
                removalPolicy: RemovalPolicy.DESTROY
            }
        }
    })
}