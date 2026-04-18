// import { bus } from "./bus";
// import { NeonDatabaseUrl } from "./neon";
// import { realtime } from "./realtime";

// /*** MAIN GAME LOOP ***/
// // Change Stage Function
// const changeStage = new sst.aws.Function('ChangeStage', {
// 	link: [NeonDatabaseUrl, bus, realtime],
// 	handler: "packages/functions/src/events/gameloop.handler",
// })

// const configure = sst.aws.StepFunctions.pass({
// 	name: 'Configure',
// 	output: {
// 		gameId: "{% $states.input.gameId %}",
// 		continue: true,
// 		waitSeconds: "{% $states.input.waitSeconds %}",
// 	}
// })

// const continueGame = sst.aws.StepFunctions.choice({
// 	name: "Continue?",
// });

// const waitX = sst.aws.StepFunctions.wait({
// 	name: "WaitX",
// 	time: "{% $states.input.waitSeconds %}",
// });

// const invokeChangeStage = sst.aws.StepFunctions.lambdaInvoke({
// 	name: "ChangeStageInvoke",
// 	function: changeStage,
// 	// Equivalent idea to outputPath: '$.Payload'
// 	output: "{% $states.result.Payload %}",
// });

// const endGame = sst.aws.StepFunctions.succeed({
// 	name: "EndGame",
// });

// continueGame.when(
// 	"{% $states.input.continue = true %}",
// 	waitX.next(invokeChangeStage.next(continueGame)),
// );
// continueGame.otherwise(endGame);

// export const changeStageMachine = new sst.aws.StepFunctions("ChangeStageMachine", {
// 	definition: configure.next(continueGame),
// 	type: "standard",
// 	logging: {
// 		level: "error",
// 		includeData: false,
// 		retention: "1 month",
// 	},
// });

// /*** TOWN HALL LOOP ***/
// const townHall = new sst.aws.Function('TownHall', {
// 	link: [NeonDatabaseUrl, bus, realtime],
// 	handler: "packages/functions/src/events/townhall.handler",
// })

// const configureTownHall = sst.aws.StepFunctions.pass({
// 	name: "ConfigureTownHall",
// 	output: {
// 		gameId: "{% $states.input.gameId %}",
// 		continue: true,
// 		count: 0,
// 		waitSeconds: "{% $states.input.waitSeconds %}",
// 	},
// });

// const continueTownHall = sst.aws.StepFunctions.choice({
// 	name: "Continue?",
// });

// const waitY = sst.aws.StepFunctions.wait({
// 	name: "WaitY",
// 	time: "{% $states.input.waitSeconds %}",
// });

// const invokeTownHall = sst.aws.StepFunctions.lambdaInvoke({
// 	name: "TownHallInvoke",
// 	function: townHall,
// 	output: "{% $states.result.Payload %}",
// });

// const endTownHall = sst.aws.StepFunctions.succeed({
// 	name: "EndTownHall",
// });

// continueTownHall.when(
// 	"{% $states.input.continue = true %}",
// 	waitY.next(invokeTownHall.next(continueTownHall)),
// );
// continueTownHall.otherwise(endTownHall);

// export const townHallMachine = new sst.aws.StepFunctions("TownHallMachine", {
// 	definition: configureTownHall.next(continueTownHall),
// 	type: "standard",
// 	logging: {
// 		level: "error",
// 		includeData: false,
// 		retention: "1 month",
// 	},
// });
