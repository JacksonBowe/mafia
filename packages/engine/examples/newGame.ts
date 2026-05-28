import { newGame } from '@mafia/engine';
import { DEFAULT_SEED, dummyConfig, dummyActors } from '@mafia/engine/testing';

const run = () => {
	const actors = dummyActors(3);
	const config = dummyConfig();

	const result = newGame({ actors, config, options: { seed: DEFAULT_SEED } });

	console.log('Game created with the following actors:');
	for (const actor of result.actors) {
		console.log(JSON.stringify(actor, null, 2));
	}

	console.log('\nGame created with the following state:');
	console.log(JSON.stringify(result.state, null, 2));

	console.log('\nEvents:');
	console.log(JSON.stringify(result.events, null, 2));

	console.log('\nWinners:');
	console.log(JSON.stringify(result.winners, null, 2));

	console.log('\nLog:');
	console.log(result.log.join('\n'));
};

run();
