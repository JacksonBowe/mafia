import { z } from 'zod';
import { MessageSchema } from './message';
import { defineRealtimeEvent } from './realtime';

export const ChatMessageSchema = z.object({
	message: MessageSchema,
});

function topicForMessage(message: z.infer<typeof MessageSchema>) {
	if (message.scope === 'menu' && message.channel === 'GLOBAL') {
		return 'menu/chat/global';
	}

	if (message.scope === 'menu' && message.channel === 'LOBBY') {
		if (!message.lobbyId) {
			throw new Error('Menu lobby messages require lobbyId');
		}
		return `menu/chat/lobby/${message.lobbyId}`;
	}

	if (message.scope === 'menu' && message.channel === 'PRIVATE') {
		if (!message.targetUserId) {
			throw new Error('Menu private messages require targetUserId');
		}
		return `menu/chat/private/${message.targetUserId}`;
	}

	if (message.scope === 'game' && message.channel === 'GLOBAL') {
		if (!message.gameId) {
			throw new Error('Game global messages require gameId');
		}
		return `game/${message.gameId}/chat/global`;
	}

	if (message.scope === 'game' && message.channel === 'TEAM') {
		if (!message.gameId || !message.teamId) {
			throw new Error('Game team messages require gameId and teamId');
		}
		return `game/${message.gameId}/chat/team/${message.teamId}`;
	}

	if (message.scope === 'game' && message.channel === 'PRIVATE') {
		if (!message.gameId || !message.targetUserId) {
			throw new Error('Game private messages require gameId and targetUserId');
		}
		return `game/${message.gameId}/chat/private/${message.targetUserId}`;
	}

	if (message.scope === 'game' && message.channel === 'DEAD') {
		if (!message.gameId) {
			throw new Error('Game dead messages require gameId');
		}
		return `game/${message.gameId}/chat/dead`;
	}

	throw new Error(`Unsupported chat topic for scope=${message.scope} channel=${message.channel}`);
}

export const RealtimeEvents = {
	Message: defineRealtimeEvent('chat.message', ChatMessageSchema, ({ message }) =>
		topicForMessage(message),
	),
};
