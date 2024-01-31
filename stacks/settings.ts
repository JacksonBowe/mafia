import { RemovalPolicy } from "aws-cdk-lib";

export const Settings = {
    removalPolicy: {
        retainStages: ['dev', 'prod']
    }
};

export function StageRemovalPolicy(stage: string) {
    return Settings.removalPolicy.retainStages.includes(stage) ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
}