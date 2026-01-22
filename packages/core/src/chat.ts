import { z } from 'zod';
import { MessageSchema } from './message';
import { defineRealtimeEvent } from './realtime';

export const ChatMessageSchema = z.object({
	message: MessageSchema,
});

function topicForMessage(message: z.infer<typeof MessageSchema>) {
	if (message.scope === 'menu' && message.channel === 'GLOBAL') {
		return 'chat/menu/global';
	}

	throw new Error(`Unsupported chat topic for scope=${message.scope} channel=${message.channel}`);
}

export const RealtimeEvents = {
	Message: defineRealtimeEvent('chat.message', ChatMessageSchema, ({ message }) =>
		topicForMessage(message),
	),
};
