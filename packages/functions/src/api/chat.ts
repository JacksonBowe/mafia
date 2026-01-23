import { assertActor } from '@mafia/core/actor';
import { RealtimeEvents } from '@mafia/core/chat';
import { InputError, zValidator } from '@mafia/core/error';
import { MenuChannelSchema, MessageSchema, type Message } from '@mafia/core/message';
import { realtime } from '@mafia/core/realtime';
import { User } from '@mafia/core/user/index';
import { Hono } from 'hono';
import { Resource } from 'sst';
import { z } from 'zod';

type Bindings = Record<string, never>;

const chatRoutes = new Hono<{ Bindings: Bindings }>();

export const SendChatMessageSchema = z.object({
	text: z.string().min(1).max(2000),
	channel: MenuChannelSchema,
});

chatRoutes.post('/message', zValidator('json', SendChatMessageSchema), async (c) => {
	const { text, channel } = c.req.valid('json');
	const actor = assertActor('user');
	const user = await User.get({ userId: actor.properties.userId });
	const presence = await User.getPresence({ userId: actor.properties.userId });

	if (channel === 'LOBBY' && !presence.lobby?.id) {
		throw new InputError('chat.lobby_required', 'Must be in a lobby to send lobby messages.');
	}

	if (channel === 'PRIVATE') {
		throw new InputError('chat.channel_unsupported', 'Private chat is not supported yet.');
	}

	const message: Message = MessageSchema.parse({
		id: crypto.randomUUID(),
		createdAt: Date.now(),
		kind: 'USER',
		sender: {
			type: 'USER',
			userId: user.id,
			displayName: user.name,
		},
		text,
		scope: 'menu',
		channel,
		...(channel === 'LOBBY' ? { lobbyId: presence.lobby?.id } : {}),
	});

	console.log('Publishing chat message', message);

	await realtime.publish(Resource.Realtime, RealtimeEvents.Message, { message });

	return c.json({ success: true, message });
});

export { chatRoutes };
