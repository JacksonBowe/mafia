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
	const topics = [`chat/game/${gameId}/global`];

	if (!actor) return topics;

	if (!actor.alive) {
		return [...topics, `chat/game/${gameId}/dead`];
	}

	const teamId = teamIdForActor(actor);
	if (teamId) {
		topics.push(`chat/game/${gameId}/team/${teamId}`);
	}

	return topics;
}
