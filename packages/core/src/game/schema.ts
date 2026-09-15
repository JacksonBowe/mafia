// Pure game-record contracts shared with the SDK.
import { z } from 'zod';
import { EntityBaseSchema } from '../db/schema';

export const GameErrors = {
	GameNotFound: 'game.not_found',
} as const;

export const GameSessionErrors = {
	GameInvalidState: 'game.invalid_state',
	PlayerNotFound: 'game.player_not_found',
	InvalidVoteTarget: 'game.invalid_vote_target',
	InvalidTarget: 'game.invalid_target',
	CannotVoteSelf: 'game.cannot_vote_self',
	PlayerNotAlive: 'game.player_not_alive',
	NotVotingPhase: 'game.not_voting_phase',
	NotTrialPhase: 'game.not_trial_phase',
} as const;

export const GameStatusSchema = z.enum(['active', 'completed', 'cancelled']);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const GameInfoSchema = EntityBaseSchema.extend({
	status: GameStatusSchema,
	startedAt: z.date(),
});
export type GameInfo = z.infer<typeof GameInfoSchema>;

export * from './session/schema';
export type * from './session/schema';
