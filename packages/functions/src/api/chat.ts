import { assertActor } from '@mafia/core/actor';
import { RealtimeEvents } from '@mafia/core/chat';
import { zValidator } from '@mafia/core/error';
import { MessageSchema, type Message } from '@mafia/core/message';
import { realtime } from '@mafia/core/realtime';
import { User } from '@mafia/core/user/index';
import { Hono } from 'hono';
import { Resource } from 'sst';
import { z } from 'zod';

type Bindings = {};

const chatRoutes = new Hono<{ Bindings: Bindings }>();

export const SendChatMessageSchema = z.object({
	text: z.string().min(1).max(2000),
});

chatRoutes.post('/message', zValidator('json', SendChatMessageSchema), async (c) => {
	const { text } = c.req.valid('json');
	const actor = assertActor('user');
	const user = await User.get({ userId: actor.properties.userId });

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
		channel: 'GLOBAL',
	});

	console.log('Publishing chat message', message);

	await realtime.publish(Resource.Realtime, RealtimeEvents.Message, { message });

	return c.json({ success: true, message });
});

export { chatRoutes };
