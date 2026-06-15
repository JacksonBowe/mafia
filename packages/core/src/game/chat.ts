import type { ActorState, GamePhase } from './schema';
import type { GameChannel } from '../message';

export type GameChatSendPolicy =
	| { canSend: true; channel: GameChannel; teamId?: string }
	| { canSend: false; reason: string };

export function teamIdForActor(actor: ActorState): string | null {
	if (actor.alignment === 'Mafia') return 'mafia';
	return null;
}

export function resolveGameChatSendPolicy(input: {
	phase: GamePhase;
	actor: ActorState;
}): GameChatSendPolicy {
	const { phase, actor } = input;

	if (!actor.alive) {
		return { canSend: true, channel: 'DEAD' };
	}

	if (phase === 'evening') {
		const teamId = teamIdForActor(actor);
		if (teamId) return { canSend: true, channel: 'TEAM', teamId };
		return { canSend: false, reason: 'No team chat available during evening.' };
	}

	if (phase === 'pregame' || phase === 'night') {
		return { canSend: false, reason: 'Chat is disabled during this phase.' };
	}

	return { canSend: true, channel: 'GLOBAL' };
}

export function resolveGameChatSubscriptionTopics(input: {
	gameId: string;
	actor: ActorState | null;
}): string[] {
	const { gameId, actor } = input;
	const topics = [`game/${gameId}/chat/global`];

	if (!actor) return topics;

	if (!actor.alive) {
		return [...topics, `game/${gameId}/chat/dead`];
	}

	const teamId = teamIdForActor(actor);
	if (teamId) {
		topics.push(`game/${gameId}/chat/team/${teamId}`);
	}

	return topics;
}
