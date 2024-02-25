import { StackContext, StaticSite, use } from "sst/constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import { API } from "./Api";

export function Site({ stack }: StackContext) {
    const { api } = use(API)

    const site = new StaticSite(stack, 'site', {
        path: 'packages/web/',
        buildOutput: 'dist/spa',
        buildCommand: 'npm ci && npm run build',
        errorPage: 'index.html',
        environment: {
            VITE_API_URL: api.url
        },
        cdk: {
            bucket: {
                removalPolicy: RemovalPolicy.DESTROY
            }
        }
    })
}