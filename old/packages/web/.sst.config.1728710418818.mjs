import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// stacks/LambdaLayers.ts
import * as lambda from "aws-cdk-lib/aws-lambda";
function LambdaLayers({ app, stack }) {
  const powertools = lambda.LayerVersion.fromLayerVersionArn(
    stack,
    "lambda-powertools",
    `arn:aws:lambda:${stack.region}:017000801446:layer:AWSLambdaPowertoolsPythonV3-python312-x86:1`
  );
  const requests = lambda.LayerVersion.fromLayerVersionArn(
    stack,
    "requests",
    `arn:aws:lambda:${stack.region}:770693421928:layer:Klayers-p312-requests:1`
  );
  const jose = new lambda.LayerVersion(stack, "python-jose", {
    code: lambda.Code.fromAsset("packages/functions/layers/python-jose")
  });
  app.addDefaultFunctionLayers([powertools]);
  return {
    powertools,
    requests,
    jose
  };
}
__name(LambdaLayers, "LambdaLayers");

// stacks/Auth.ts
import { Auth as SSTAuth, Config, Table } from "sst/constructs";
function Auth({ stack }) {
  const secrets = Config.Secret.create(stack, "DISCORD_OAUTH_CLIENT_ID", "DISCORD_OAUTH_CLIENT_SECRET");
  const auth = new SSTAuth(stack, "auth", {
    authenticator: {
      handler: "packages/functions/src/functions/rest/auth.handler"
      // prefix: "stub"
    }
  });
  const sessionTable = new Table(stack, "SessionTable", {
    fields: {
      userId: "string",
      accessToken: "string",
      refreshToken: "string",
      expiresAt: "number"
    },
    primaryIndex: { partitionKey: "userId" },
    globalIndexes: {
      itemsByExpiresAt: { partitionKey: "expiresAt" }
    }
  });
  return {
    auth,
    sessionTable
  };
}
__name(Auth, "Auth");

// stacks/Api.ts
import { Api, Function, use as use2 } from "sst/constructs";

// stacks/Storage.ts
import { Table as Table2 } from "sst/constructs";

// stacks/settings.ts
import { RemovalPolicy } from "aws-cdk-lib";
var Settings = {
  removalPolicy: {
    retainStages: ["dev", "prod"]
  }
};
function StageRemovalPolicy(stage) {
  return Settings.removalPolicy.retainStages.includes(stage) ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
}
__name(StageRemovalPolicy, "StageRemovalPolicy");

// stacks/Storage.ts
function Storage({ stack }) {
  const userTable = new Table2(stack, "UserTable", {
    fields: {
      PK: "string",
      SK: "string",
      type: "string"
    },
    primaryIndex: { partitionKey: "PK", sortKey: "SK" },
    cdk: {
      table: {
        removalPolicy: StageRemovalPolicy(stack.stage)
      }
    }
  });
  const lobbyTable = new Table2(stack, "LobbyTable", {
    fields: {
      PK: "string",
      SK: "string",
      type: "string"
    },
    primaryIndex: { partitionKey: "PK", sortKey: "SK" },
    globalIndexes: {
      itemsByType: { partitionKey: "type" }
    },
    cdk: {
      table: {
        removalPolicy: StageRemovalPolicy(stack.stage)
      }
    }
  });
  return {
    userTable,
    lobbyTable
  };
}
__name(Storage, "Storage");

// stacks/Events.ts
import { EventBus, use } from "sst/constructs";
function Events({ stack }) {
  const { lobbyTable, userTable } = use(Storage);
  const bus = new EventBus(stack, "bus");
  bus.subscribe("lobby.user_join", {
    handler: "packages/functions/src/functions/events/lobby/user_join.handler",
    bind: [lobbyTable],
    environment: {
      SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName
    },
    permissions: ["iot"]
  });
  bus.subscribe("lobby.user_leave", {
    handler: "packages/functions/src/functions/events/lobby/user_leave.handler",
    bind: [lobbyTable, userTable],
    environment: {
      SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
      SST_TABLE_TABLENAME_USERTABLE: userTable.tableName
    },
    permissions: ["iot"]
  });
  return {
    bus
  };
}
__name(Events, "Events");

// stacks/Api.ts
function API({ stack, app }) {
  const { powertools, requests, jose } = use2(LambdaLayers);
  const { userTable, lobbyTable } = use2(Storage);
  const { bus } = use2(Events);
  const { sessionTable } = use2(Auth);
  const apiHandler = "packages/functions/src/functions/rest/main.handler";
  const api = new Api(stack, "api", {
    authorizers: {
      token: {
        type: "lambda",
        function: new Function(stack, "Authorizer", {
          handler: "packages/functions/src/functions/rest/authorizer.handler",
          permissions: ["ssm"],
          layers: [requests, jose],
          bind: [userTable, lobbyTable, sessionTable],
          environment: {
            SST_TABLE_TABLENAME_USERTABLE: userTable.tableName,
            SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
            SST_EVENTBUS_EVENTBUSNAME_BUS: bus.eventBusName,
            SST_TABLE_TABLENAME_SESSIONTABLE: sessionTable.tableName
          }
        })
      }
    },
    defaults: {
      authorizer: "token",
      function: {
        permissions: ["ssm", "iot:Publish"],
        bind: [userTable, lobbyTable, bus, sessionTable],
        environment: {
          SST_TABLE_TABLENAME_USERTABLE: userTable.tableName,
          SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
          SST_EVENTBUS_EVENTBUSNAME_BUS: bus.eventBusName,
          SST_TABLE_TABLENAME_SESSIONTABLE: sessionTable.tableName
        }
      }
    },
    routes: {
      // AuthController
      "GET /auth/authorize/discord": { function: { handler: apiHandler, layers: [jose, requests] }, authorizer: "none" },
      "POST /auth/token/discord": { function: { handler: apiHandler, layers: [jose, requests] }, authorizer: "none" },
      "POST /auth/token/refresh": { function: { handler: apiHandler, layers: [jose, requests] }, authorizer: "none" },
      // UserController
      "GET /users/me": apiHandler,
      "GET /users/{userId}": apiHandler,
      // LobbyController
      "POST /lobbies": apiHandler,
      "GET /lobbies": apiHandler,
      "POST /lobbies/terminate": apiHandler,
      "GET /lobbies/{lobbyId}": apiHandler,
      "POST /lobbies/{lobbyId}/join": apiHandler,
      "POST /lobbies/{lobbyId}/terminate": apiHandler,
      "POST /lobbies/leave": apiHandler,
      "POST /lobbies/start": apiHandler,
      // ChatController
      "POST /chat/message": apiHandler
    }
  });
  stack.addOutputs({
    ApiEndpoint: api.url
  });
  return {
    api
  };
}
__name(API, "API");

// stacks/Site.ts
import { StaticSite, use as use4 } from "sst/constructs";
import { RemovalPolicy as RemovalPolicy2 } from "aws-cdk-lib";
import * as iam2 from "aws-cdk-lib/aws-iam";

// stacks/IoT.ts
import { Topic, use as use3 } from "sst/constructs";
import { useIOTEndpoint } from "sst/iot.js";
import * as iot from "@aws-cdk/aws-iot-alpha";
import * as actions from "@aws-cdk/aws-iot-actions-alpha";
import * as iam from "aws-cdk-lib/aws-iam";
async function IoT({ app, stack }) {
  const { userTable, lobbyTable } = use3(Storage);
  const { bus } = use3(Events);
  const iotBase = `${app.name}/${app.stage}`;
  let iotEndpoint = "";
  await useIOTEndpoint().then((result) => {
    iotEndpoint = result;
  });
  const iotUser = new iam.User(stack, "IotUser", {
    userName: `${app.name}-${app.stage}-iot-user`
  });
  iotUser.addToPolicy(
    new iam.PolicyStatement({
      actions: [
        "iot:Connect",
        "iot:Subscribe",
        "iot:Receive"
        // No publish permission
      ],
      resources: [`*`],
      effect: iam.Effect.ALLOW
    })
  );
  iotUser.addToPolicy(
    new iam.PolicyStatement({
      resources: [`arn:aws:iot:${stack.region}:${stack.account}:topic/${iotBase}/disconnect`],
      actions: ["iot:Publish"],
      effect: iam.Effect.ALLOW
    })
  );
  const topic = new Topic(stack, "IoTDisconnectTopic", {
    subscribers: {
      disconnect: "packages/functions/src/functions/events/iot.disconnect"
    },
    defaults: {
      function: {
        environment: {
          SST_TABLE_TABLENAME_USERTABLE: userTable.tableName,
          SST_TABLE_TABLENAME_LOBBYTABLE: lobbyTable.tableName,
          SST_EVENTBUS_EVENTBUSNAME_BUS: bus.eventBusName
        },
        bind: [userTable, lobbyTable, bus],
        permissions: ["iot:Publish"]
      }
    }
  });
  const topicRule = new iot.TopicRule(stack, "IoTDisconnectRule", {
    topicRuleName: `${app.name}_${app.stage}_iot_disconnect`,
    description: "Handle IoT Core disconnect events",
    sql: iot.IotSql.fromStringAsVer20160323(`SELECT * FROM '${iotBase}/disconnect'`),
    actions: [new actions.SnsTopicAction(topic.cdk.topic)]
  });
  stack.addOutputs({
    IoTEndpoint: iotEndpoint
  });
  return {
    iotUser,
    iotEndpoint,
    iotBase,
    topic,
    topicRule
  };
}
__name(IoT, "IoT");

// stacks/Site.ts
function Site({ app, stack }) {
  const { api } = use4(API);
  const { iotUser, iotEndpoint, iotBase } = use4(IoT);
  const accessKey = new iam2.AccessKey(stack, "iotAccessKey", { user: iotUser });
  const site = new StaticSite(stack, "site", {
    path: "packages/web/",
    buildOutput: "dist/spa",
    buildCommand: "bun install --frozen-lockfile && bun run build",
    errorPage: "index.html",
    environment: {
      VITE_API_URL: api.url,
      VITE_APP_NAME: app.name,
      VITE_APP_STAGE: app.stage,
      VITE_APP_REGION: app.region,
      VITE_IOT_ENDPOINT: iotEndpoint,
      VITE_IOT_BASE: iotBase,
      VITE_IOT_ACCESS_KEY_ID: accessKey.accessKeyId,
      VITE_IOT_SECRET_ACCESS_KEY: accessKey.secretAccessKey.toString()
    },
    cdk: {
      bucket: {
        removalPolicy: RemovalPolicy2.DESTROY
      }
    }
  });
  stack.addOutputs({
    SiteUrl: site.url || "http://localhost:9000",
    iotUser: iotUser.userName || "No user",
    stage: app.stage
  });
}
__name(Site, "Site");

// sst.config.ts
var sst_config_default = {
  config(_input) {
    return {
      name: "mafia",
      region: "ap-southeast-2"
    };
  },
  async stacks(app) {
    app.setDefaultFunctionProps({
      runtime: "python3.12",
      copyFiles: [{ from: "packages/core/src", to: "." }],
      python: {
        noDocker: true
      }
    });
    await app.stack(LambdaLayers).stack(Storage).stack(Events).stack(Auth).stack(API).stack(IoT);
    app.stack(Site);
  }
};
export {
  sst_config_default as default
};
