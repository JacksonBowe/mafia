import { NeonDatabaseUrl } from './neon';
import { realtime } from './realtime';

// Advances the game loop exactly one phase per invocation. Step Functions only
// waits, invokes, and branches; all game correctness lives in this Lambda.
const advanceGameLoop = new sst.aws.Function('GameLoopAdvance', {
	handler: 'packages/functions/src/gameloop/advance.handler',
	link: [NeonDatabaseUrl, realtime],
});

// Role assumed by Step Functions to invoke the advance Lambda.
const gameLoopRole = new aws.iam.Role('GameLoopMachineRole', {
	assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
		Service: 'states.amazonaws.com',
	}),
});

new aws.iam.RolePolicy('GameLoopMachinePolicy', {
	role: gameLoopRole.id,
	policy: $jsonStringify({
		Version: '2012-10-17',
		Statement: [
			{
				Effect: 'Allow',
				Action: 'lambda:InvokeFunction',
				Resource: [advanceGameLoop.arn, $interpolate`${advanceGameLoop.arn}:*`],
			},
		],
	}),
});

// Standard workflow:
//   ConfigureGameLoop -> ContinueGame?
//     true  -> WaitForPhase -> AdvanceGameLoop -> ContinueGame?
//     false -> EndGame
//
// Written as raw ASL instead of `sst.aws.StepFunctions`: the fluent builder
// serializes the state graph by recursively walking `next`/choice pointers with
// no visited set, so the loop's back-edge (AdvanceGameLoop -> ContinueGame?)
// overflows the stack. AWS Step Functions itself loops fine; only the SST helper
// cannot express it. First call starts with `waitSeconds: 0` so the loop
// publishes the opening phase/role reveal immediately.
const stateMachine = new aws.sfn.StateMachine('GameLoopMachineStateMachine', {
	roleArn: gameLoopRole.arn,
	type: 'STANDARD',
	definition: $jsonStringify({
		QueryLanguage: 'JSONata',
		StartAt: 'ConfigureGameLoop',
		States: {
			ConfigureGameLoop: {
				Type: 'Pass',
				Output: {
					gameId: '{% $states.input.gameId %}',
					continue: true,
					waitSeconds: 0,
				},
				Next: 'ContinueGame?',
			},
			'ContinueGame?': {
				Type: 'Choice',
				Choices: [
					{
						Condition: '{% $states.input.continue = true %}',
						Next: 'WaitForPhase',
					},
				],
				Default: 'EndGame',
			},
			WaitForPhase: {
				Type: 'Wait',
				Seconds: '{% $states.input.waitSeconds %}',
				Next: 'AdvanceGameLoop',
			},
			AdvanceGameLoop: {
				Type: 'Task',
				Resource: 'arn:aws:states:::lambda:invoke',
				Arguments: {
					FunctionName: advanceGameLoop.arn,
					Payload: '{% $states.input %}',
				},
				Output: '{% $states.result.Payload %}',
				Retry: [
					{
						ErrorEquals: [
							'Lambda.ServiceException',
							'Lambda.AWSLambdaException',
							'Lambda.SdkClientException',
							'Lambda.TooManyRequestsException',
						],
						IntervalSeconds: 2,
						MaxAttempts: 3,
						BackoffRate: 2,
					},
				],
				Next: 'ContinueGame?',
			},
			EndGame: {
				Type: 'Succeed',
			},
		},
	}),
});

// Linkable so the API Lambda can read the machine ARN and start executions.
export const gameLoopMachine = new sst.Linkable('GameLoopMachine', {
	properties: {
		arn: stateMachine.arn,
	},
	include: [
		sst.aws.permission({
			actions: ['states:StartExecution'],
			resources: [stateMachine.arn],
		}),
		sst.aws.permission({
			actions: ['states:DescribeExecution', 'states:StopExecution'],
			resources: [
				stateMachine.arn.apply((arn) => `${arn.replace('stateMachine', 'execution')}:*`),
			],
		}),
	],
});
