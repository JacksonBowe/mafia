import { describe, expect, it, vi } from 'vitest';

// ballot.ts imports persistence commands alongside pure tally helpers. Keep DB inactive here.
vi.mock('../../src/db/transaction', () => ({
	afterTx: vi.fn(),
	createTransaction: vi.fn(),
	useTransaction: vi.fn(),
}));

import { tallyVerdicts, tallyVotes } from '../../src/game/session/ballot';
import type { GamePlayer } from '../../src/game/session/schema';

const gameId = '01KJ2CQYHNZPZ8D3ZV6GZ9YNN0';

const player = (actorId: string, number: number): GamePlayer => ({
	actorId,
	gameId,
	id: `01KJ2CQYHNZPZ8D3ZV6GZ9YNN${number}`,
	number,
	onTrial: false,
	targetActorIds: [],
	userId: `01KJ2CQYHNZPZ8D3ZV6GZ9YNN${number}`,
	verdict: null,
	voteTargetActorId: null,
});

describe('ballot rules', () => {
	it('excludes votes cast by or targeting dead actors', () => {
		const players = [
			{ ...player('alive-voter', 1), voteTargetActorId: 'alive-target' },
			{ ...player('dead-voter', 2), voteTargetActorId: 'alive-target' },
			{ ...player('other-voter', 3), voteTargetActorId: 'dead-target' },
			player('alive-target', 4),
			player('dead-target', 5),
		];

		expect(tallyVotes(players, ['alive-voter', 'other-voter', 'alive-target'])).toEqual({
			votes: { 'alive-target': 1 },
			winner: null,
		});
	});

	it('excludes trial and dead players while treating no verdict as abstention', () => {
		const players = [
			{ ...player('on-trial', 1), onTrial: true, verdict: 'guilty' as const },
			{ ...player('guilty', 2), verdict: 'guilty' as const },
			{ ...player('innocent', 3), verdict: 'innocent' as const },
			player('abstain', 4),
			{ ...player('dead', 5), verdict: 'guilty' as const },
		];

		expect(tallyVerdicts(players, ['on-trial', 'guilty', 'innocent', 'abstain'])).toEqual({
			guiltyCount: 1,
			innocentCount: 1,
			abstainCount: 1,
			isGuilty: false,
		});
	});
});
