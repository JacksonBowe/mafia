import { assertActor } from '@mafia/core/actor';
import { RealtimeEvents } from '@mafia/core/chat';
import { InputError, zValidator } from '@mafia/core/error';
import { resolveGameChatSendPolicy } from '@mafia/core/game/chat';
import { Game } from '@mafia/core/game/index';
import { MessageSchema, type Message } from '@mafia/core/message';
import { realtime } from '@mafia/core/realtime';
import { User } from '@mafia/core/user/index';
import { Hono } from 'hono';
import { Resource } from 'sst';
import { SendChatMessageJsonSchema } from './schemas/chat.schemas';

type Bindings = Record<string, never>;

const chatRoutes = new Hono<{ Bindings: Bindings }>();

chatRoutes.post('/message', zValidator('json', SendChatMessageJsonSchema), async (c) => {
	const input = SendChatMessageJsonSchema.parse(c.req.valid('json'));
	const actor = assertActor('user');
	const user = await User.get({ userId: actor.properties.userId });
	const userId = actor.properties.userId;

	let message: Message;

	if ('channel' in input) {
		const text = input.text;
		const channel = input.channel;
		const presence = await User.getPresence({ userId });

		if (channel === 'LOBBY' && !presence.lobby?.id) {
			throw new InputError('chat.lobby_required', 'Must be in a lobby to send lobby messages.');
		}

		if (channel === 'PRIVATE') {
			throw new InputError('chat.channel_unsupported', 'Private chat is not supported yet.');
		}

		message = MessageSchema.parse({
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
	} else {
		const game = await Game.sync({ userId });
		if (!game) {
			throw new InputError('chat.game_required', 'Must be in a game to send game messages.');
		}

		const policy = resolveGameChatSendPolicy({ phase: game.info.phase, actor: game.actor });
		if (!policy.canSend) {
			throw new InputError('chat.disabled', policy.reason);
		}

		message = MessageSchema.parse({
			id: crypto.randomUUID(),
			createdAt: Date.now(),
			kind: 'USER',
			sender: {
				type: 'USER',
				userId: user.id,
				displayName: game.actor.alias,
			},
			text: input.text,
			scope: 'game',
			channel: policy.channel,
			gameId: game.info.id,
			...(policy.teamId ? { teamId: policy.teamId } : {}),
		});

		await Game.recordChatMessage({
			gameId: game.info.id,
			actorId: game.actor.id,
			message,
		});
	}

	console.log('Publishing chat message', message);

	await realtime.publish(Resource.Realtime, RealtimeEvents.Message, { message });

	return c.json({ success: true, message });
});

export { chatRoutes };
