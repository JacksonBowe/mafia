import { newGame, resolveGame } from '@mafia/engine';
import { DEFAULT_SEED, dummyConfig, dummyActors, toActorInput } from '@mafia/engine/testing';

const run = () => {
	const actors = dummyActors(3);
	const config = dummyConfig();
	const created = newGame({ actors, config, options: { seed: DEFAULT_SEED } });
	const loadedActors = created.actors.map(toActorInput);

	const mafia = loadedActors.find((actor) => actor.role === 'Mafioso');
	const target = loadedActors.find((actor) => actor.role !== 'Mafioso');
	if (mafia && target?.number) {
		mafia.targets = [target.number];
	}

	const resolved = resolveGame({
		actors: loadedActors,
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
