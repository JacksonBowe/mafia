import { DEFAULT_SEED, dummyActors, dummyConfig } from '@mafia/engine/testing';
import { newGame } from '@mafia/engine';
import { ulid } from 'ulid';
import { describe, expect, it } from 'vitest';
import { CreateGameInputSchema } from '../../src/game/schema';

const createInput = () => {
	const config = dummyConfig();
	const result = newGame({ actors: dummyActors(3), config, options: { seed: DEFAULT_SEED } });

	return {
		engineState: result.state,
		engineConfig: config,
		actors: result.actors,
		engineLog: result.log,
		players: result.actors.map((actor) => ({
			userId: ulid(),
			actorId: actor.id,
			number: actor.number ?? 0,
		})),
	};
};

describe('game creation input', () => {
	it('accepts engine output and matching player records', () => {
		expect(CreateGameInputSchema.safeParse(createInput()).success).toBe(true);
	});

	it('rejects malformed persisted engine state', () => {
		const input = createInput();
		input.engineState = { day: -1 } as typeof input.engineState;

		expect(CreateGameInputSchema.safeParse(input).success).toBe(false);
	});

	it('rejects duplicate player identity and number fields', () => {
		const input = createInput();
		input.players[1] = { ...input.players[1], ...input.players[0] };

		expect(CreateGameInputSchema.safeParse(input).success).toBe(false);
	});

	it('rejects missing actor references and mismatched player numbers', () => {
		const missingActor = createInput();
		missingActor.players[0].actorId = 'missing-actor';
		expect(CreateGameInputSchema.safeParse(missingActor).success).toBe(false);

		const mismatchedNumber = createInput();
		mismatchedNumber.players[0].number += 10;
		expect(CreateGameInputSchema.safeParse(mismatchedNumber).success).toBe(false);
	});
});
