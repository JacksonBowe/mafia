import { use, Function } from 'sst/constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StorageStack } from './MafiaStorage';
import { Duration } from 'aws-cdk-lib';

export function StepFunctionsStack({ stack }) {
	const { table } = use(StorageStack);

	const powertools = lambda.LayerVersion.fromLayerVersionArn(
		stack,
		'lambda-powertools',
		`arn:aws:lambda:${stack.region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:34`,
	);

	/*** GAME LOOP ***/
	// Change Stage Function
	const changeStage = new Function(this, 'ChangeStage', {
		handler: 'packages/functions/game.changeStage',
		environment: {
			REGION: stack.region,
			TABLE_NAME: table.tableName,
		},
		permissions: ['iot:Publish', table],
		logRetention: 'one_day',
		layers: [powertools],
	});

	// General
	const configure = new sfn.Pass(this, 'Configure', {
		// result: sfn.Result.fromObject({ "gameId.$": "$.gameId", continue: true, waitSeconds: 3}),
		parameters: {
			gameId: sfn.JsonPath.stringAt('$.gameId'),
			continue: true,
			waitSeconds: sfn.JsonPath.numberAt('$.waitSeconds'),
		},
	});

	const invokeChangeStage = new tasks.LambdaInvoke(this, 'ChangeStageInvoke', {
		lambdaFunction: changeStage,
		outputPath: '$.Payload',
	});

	const waitX = new sfn.Wait(this, 'WaitX', {
		time: sfn.WaitTime.secondsPath('$.waitSeconds'),
	});

	const endGame = new sfn.Pass(this, 'End game');

	const checkForWin = new sfn.Choice(this, 'Winner?');

	const changeStageDefinition = configure.next(
		checkForWin
			.when(
				sfn.Condition.booleanEquals('$.continue', true),
				waitX.next(invokeChangeStage.next(checkForWin)),
			)
			.otherwise(endGame),
	);

	const changeStageMachine = new sfn.StateMachine(this, 'ChangeStageMachine', {
		definition: changeStageDefinition,
		timeout: Duration.minutes(5),
	});

	// changeStage.addEnvironment("CHANGE_STATE_MACHINE_ARN", changeStageMachine.stateMachineArn)
	// TODO
	// Vote polling

	/*** VOTING SYSTEM ***/
	// Change Stage Function
	const townHall = new Function(this, 'TownHall', {
		handler: 'packages/functions/game.townHall',
		environment: {
			REGION: stack.region,
			TABLE_NAME: table.tableName,
		},
		permissions: ['iot:Publish', table],
		logRetention: 'one_day',
		layers: [powertools],
	});

	const configureTownHall = new sfn.Pass(this, 'ConfigureTownHall', {
		// result: sfn.Result.fromObject({ "gameId.$": "$.gameId", continue: true, waitSeconds: 3}),
		parameters: {
			gameId: sfn.JsonPath.stringAt('$.gameId'),
			continue: true,
			count: 0,
			waitSeconds: sfn.JsonPath.numberAt('$.waitSeconds'),
		},
	});

	const invokeTownHall = new tasks.LambdaInvoke(this, 'TownHallInvoke', {
		lambdaFunction: townHall,
		outputPath: '$.Payload',
	});

	const waitY = new sfn.Wait(this, 'WaitY', {
		time: sfn.WaitTime.secondsPath('$.waitSeconds'),
	});

	const endTownHall = new sfn.Pass(this, 'End Town Hall');

	const continueTownHall = new sfn.Choice(this, 'Continue?');

	const townHallDefinition = configureTownHall.next(
		continueTownHall
			.when(
				sfn.Condition.booleanEquals('$.continue', true),
				waitY.next(invokeTownHall.next(continueTownHall)),
			)
			.otherwise(endTownHall),
	);

	const townHallMachine = new sfn.StateMachine(this, 'TownHallMachine', {
		definition: townHallDefinition,
		timeout: Duration.minutes(6),
	});
	return {
		changeStageMachine,
		townHallMachine,
	};
}
