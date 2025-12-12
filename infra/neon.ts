const PROJECT_ID = process.env.NEON_PROJECT_ID!
const DB_NAME = process.env.NEON_DB_NAME!
const DB_OWNER_NAME = process.env.NEON_DB_OWNER_NAME!

const PROD_BRANCH_ID = process.env.NEON_PROD_BRANCH_ID!
const PROD_ENDPOINT_ID = process.env.NEON_PROD_ENDPOINT_ID!


const branch = (() => {
    switch ($app.stage) {
        case 'prod':
            return neon.Branch.get('DatabaseBranch', PROD_BRANCH_ID)
        default:
            return new neon.Branch('DatabaseBranch', {
                name: `${$app.stage}-local`,
                parentId: PROD_BRANCH_ID,
                projectId: PROJECT_ID
            })
    }
})()

const endpoint = (() => {
    switch ($app.stage) {
        case 'prod':
            return neon.Endpoint.get('DatabaseEndpoint', PROD_ENDPOINT_ID)
        default:
            return new neon.Endpoint('DatabaseEndpoint', {
                autoscalingLimitMinCu: 0.25,
                autoscalingLimitMaxCu: 0.5,
                branchId: branch.id,
                computeProvisioner: 'k8s-neonvm',
                poolerEnabled: true,
                poolerMode: 'transaction',
                projectId: PROJECT_ID,
                regionId: 'aws-ap-southeast-2',
                type: 'read_write',
            })
    }
})()

const role = neon.Role.get('DatabaseOwner', $interpolate`${PROJECT_ID}/${branch.id}/${DB_OWNER_NAME}`)

export const NeonDatabaseUrl = new sst.Linkable('NeonDatabaseUrl', {
    properties: {
        value: $interpolate`postgresql://${role.name}:${role.password}@${endpoint.host}/${DB_NAME}?sslmode=require`
    }
})

new sst.x.DevCommand("Studio", {
    link: [NeonDatabaseUrl],
    dev: {
        autostart: true,
        directory: "packages/core",
        command: "npx drizzle-kit studio"
    }
})

const migrator = new sst.aws.Function("DatabaseMigrator", {
    handler: "packages/functions/src/migrator.handler",
    link: [NeonDatabaseUrl],
    copyFiles: [
        {
            from: "packages/core/migrations",
            to: "./migrations"
        }
    ]
})

if (!$dev) {
    new aws.lambda.Invocation("DatabaseMigratorInvocation", {
        input: Date.now().toString(),
        functionName: migrator.name,
    });
}
