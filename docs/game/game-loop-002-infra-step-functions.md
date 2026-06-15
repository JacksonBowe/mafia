# Stage 2: Infra And Step Functions

Goal: replace commented sketch in `infra/gameloop.ts` with one Standard Step Function and one Lambda.

## Existing Files

- `infra/gameloop.ts`: commented sketch for old loop.
- `infra/api.ts`: API Lambda links `NeonDatabaseUrl`, `auth`, `bus`, `realtime`.
- `infra/bus.ts`: EventBridge bus and realtime disconnect subscriber.
- `infra/neon.ts`: `NeonDatabaseUrl` linkable.
- `infra/realtime.ts`: `realtime` resource.
- `sst.config.ts`: imports every file under `infra/` dynamically.

## Desired Resource Shape

Use one workflow:

```text
Configure
  -> Continue?
     true  -> Wait -> AdvancePhase Lambda -> Continue?
     false -> End
```

Do not port `TownHallMachine`. Poll/trial loop is inside phase advance.

## Lambda

Create:

```ts
const advanceGameLoop = new sst.aws.Function('GameLoopAdvance', {
	handler: 'packages/functions/src/gameloop/advance.handler',
	link: [NeonDatabaseUrl, bus, realtime],
});
```

If `bus` is unused by first implementation, link only `NeonDatabaseUrl` and `realtime`. Prefer minimal links.

## State Machine Definition

SST v4 supports `sst.aws.StepFunctions`. Existing sketch uses JSONata-like expressions:

```ts
sst.aws.StepFunctions.pass({ output: { gameId: '{% $states.input.gameId %}' } })
```

Before coding, verify syntax against local SST type hints/docs if needed. Keep same style as commented sketch unless compile fails.

Target logic:

```ts
const configure = sst.aws.StepFunctions.pass({
	name: 'ConfigureGameLoop',
	output: {
		gameId: '{% $states.input.gameId %}',
		continue: true,
		waitSeconds: 0,
	},
});

const continueGame = sst.aws.StepFunctions.choice({ name: 'ContinueGame?' });

const waitForPhase = sst.aws.StepFunctions.wait({
	name: 'WaitForPhase',
	time: '{% $states.input.waitSeconds %}',
});

const advance = sst.aws.StepFunctions.lambdaInvoke({
	name: 'AdvanceGameLoop',
	function: advanceGameLoop,
	output: '{% $states.result.Payload %}',
});

continueGame.when(
	'{% $states.input.continue = true %}',
	waitForPhase.next(advance.next(continueGame)),
);
continueGame.otherwise(endGame);
```

Start with `waitSeconds: 0` so first Lambda call publishes `pregame`/role reveal immediately. Alternative: start with `15` after persisting `pregame`, but then clients may miss role reveal timing. Immediate first call is simpler and server-authoritative.

## Retry And Catch

Add Lambda retry if SST helper supports it. Desired behavior:

- Retry transient Lambda failures 2-3 times.
- On final failure, invoke a failure handler or let execution fail and rely on CloudWatch alarm later.

Minimal first pass: retry only. Do not add second failure Lambda unless needed.

If catch is easy, add `GameLoopFail` Lambda that publishes `game.terminated` and sets status `cancelled`.

## Outputs

Export the machine so API can link/start it.

Likely output/resource:

```ts
export const gameLoopMachine = new sst.aws.StepFunctions('GameLoopMachine', { ... });
```

Then in `infra/api.ts`, link it:

```ts
import { gameLoopMachine } from './gameloop';

link: [NeonDatabaseUrl, discordClientId, discordClientSecret, auth, bus, realtime, gameLoopMachine]
```

Confirm SST resource name available in Lambda via `Resource.GameLoopMachine` or generated binding. If StepFunctions resource is not linkable, use environment variable or IAM + ARN output supported by SST.

## Starting Executions

Start execution from API when lobby starts.

Preferred deterministic execution name:

```ts
name: gameId
```

This prevents duplicate game loops. If duplicate start returns `ExecutionAlreadyExists`, treat as idempotent success.

Use AWS SDK v3 in Lambda/API code:

```ts
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
```

If dependency is missing, add package to relevant workspace only if repo already uses AWS SDK modular packages. `@mafia/core` already imports `@aws-sdk/client-iot-data-plane`, so modular AWS SDK pattern exists.

## Timeout

Old v2 machine had 5-minute timeout, bad for long games. Standard workflow can run up to 1 year. Do not set a short state machine timeout.

Lambda timeout should not be huge. Most phases are quick. `night` should not sleep for event durations; Step Function wait handles phase duration externally.

## Acceptance

- `infra/gameloop.ts` exports one `gameLoopMachine`.
- No `TownHallMachine`.
- API Lambda can access machine ARN/name needed to start execution.
- Starting same `gameId` twice is idempotent or returns controlled success.
- `bun run lint` or relevant package lint passes after infra syntax is correct.
