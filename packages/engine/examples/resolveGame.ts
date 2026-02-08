import { newGame, resolveGame } from '../src/index';
import { DEFAULT_SEED, dummyConfig, dummyPlayers, toPlayerInput } from './_helpers';

const run = () => {
	const players = dummyPlayers(3);
	const config = dummyConfig();
	const created = newGame({ players, config, options: { seed: DEFAULT_SEED } });
	const loadedPlayers = created.actors.map(toPlayerInput);

	const mafia = loadedPlayers.find((player) => player.role === 'Mafioso');
	const target = loadedPlayers.find((player) => player.role !== 'Mafioso');
	if (mafia && target?.number) {
		mafia.targets = [target.number];
	}

	const resolved = resolveGame({
		players: loadedPlayers,
		config,
		state: created.state,
		options: { seed: DEFAULT_SEED },
	});

	console.log('Resolved game state:');
	console.log(JSON.stringify(resolved.state, null, 2));

	console.log('\nResolved events:');
	console.log(JSON.stringify(resolved.events, null, 2));

	console.log('\nWinners:');
	console.log(JSON.stringify(resolved.winners, null, 2));

	console.log('\nLog:');
	console.log(resolved.log.join('\n'));
};

run();
