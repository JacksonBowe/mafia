import { loadGame, newGame } from '../src/index';
import { DEFAULT_SEED, dummyConfig, dummyPlayers, toPlayerInput } from './_helpers';

const run = () => {
	const players = dummyPlayers(3);
	const config = dummyConfig();
	const created = newGame({ players, config, options: { seed: DEFAULT_SEED } });
	const loaded = loadGame({
		players: created.actors.map(toPlayerInput),
		config,
		state: created.state,
		options: { seed: DEFAULT_SEED },
	});

	console.log('Loaded game actors:');
	for (const actor of loaded.actors) {
		console.log(JSON.stringify(actor, null, 2));
	}

	console.log('\nLoaded game state:');
	console.log(JSON.stringify(loaded.state, null, 2));

	console.log('\nEvents:');
	console.log(JSON.stringify(loaded.events, null, 2));

	console.log('\nWinners:');
	console.log(JSON.stringify(loaded.winners, null, 2));

	console.log('\nLog:');
	console.log(loaded.log.join('\n'));
};

run();
