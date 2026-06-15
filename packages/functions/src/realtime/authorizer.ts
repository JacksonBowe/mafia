import { createClient } from '@openauthjs/openauth/client';
import { Resource } from 'sst';
import { realtime } from 'sst/aws/realtime';
import { z } from 'zod';
import { isULID } from '@mafia/core/error';
import { resolveGameChatSubscriptionTopics } from '@mafia/core/game/chat';
import { Game } from '@mafia/core/game/index';
import { topicPrefix } from '@mafia/core/realtime';
import { User } from '@mafia/core/user/index';
import { subjects } from '../subjects';

const RealtimeCredentialSchema = z.discriminatedUnion('scope', [
	z.object({ scope: z.literal('menu'), token: z.string().min(1), userId: z.string().min(1) }),
	z.object({
		scope: z.literal('game'),
		token: z.string().min(1),
		userId: z.string().min(1),
		gameId: isULID(),
	}),
]);

type RealtimeCredential = z.infer<typeof RealtimeCredentialSchema>;

const client = createClient({
	clientID: 'web-app',
	issuer: Resource.Auth.url,
});

/**
 * Resolve a userId from the MQTT password.
 * Bots and the web app connect identically; only the credential differs:
 * an OpenAuth access token (web) or a raw API key (bots/programmatic users).
 */
async function resolveUserId(token: string): Promise<string | null> {
	// 1. OpenAuth access token (web app)
	try {
		const claims = await client.verify(subjects, token);
		if (!claims.err) {
			return claims.subject.properties.userId;
		}
	} catch (err) {
		console.warn('Realtime token verification threw', { err });
	}

	// 2. API key fallback (bots / programmatic users)
	try {
		const user = await User.ApiKey.getUserForKey({ apiKey: token });
		return user.id;
	} catch {
		return null;
	}
}

function parseCredential(token: string): RealtimeCredential | null {
	try {
		return RealtimeCredentialSchema.parse(JSON.parse(token));
	} catch {
		return null;
	}
}

function authorizeMenu(prefix: string, userId: string) {
	return {
		principalId: userId,
		publish: [`${prefix}/menu/$disconnect`],
		subscribe: [
			`${prefix}/menu/chat/global`,
			`${prefix}/menu/chat/lobby/*`,
			`${prefix}/menu/chat/private/${userId}`,
			`${prefix}/menu/lobby/*`,
		],
	};
}

async function authorizeGame(prefix: string, userId: string, gameId: string) {
	const game = await Game.get({ gameId });
	if (game.status !== 'active') {
		console.warn('Realtime authorizer: game connection requested for inactive game', { gameId, userId });
		return { publish: [], subscribe: [] };
	}

	const player = game.players.find((p) => p.userId === userId);
	if (!player) {
		console.warn('Realtime authorizer: user is not a player in requested game', { gameId, userId });
		return { publish: [], subscribe: [] };
	}

	const actor = game.actors.find((a) => a.id === player.actorId) ?? null;
	if (!actor) {
		console.warn('Realtime authorizer: player actor missing in requested game', { gameId, userId });
		return { publish: [], subscribe: [] };
	}

	return {
		principalId: userId,
		publish: [`${prefix}/game/${gameId}/$disconnect`],
		subscribe: [
			`${prefix}/game/${gameId}/events`,
			`${prefix}/game/${gameId}/actor/${actor.id}`,
			...resolveGameChatSubscriptionTopics({ gameId, actor }).map((topic) => `${prefix}/${topic}`),
		],
	};
}

export const handler = realtime.authorizer(async (token) => {
	const prefix = topicPrefix();

	if (!token) {
		return { publish: [], subscribe: [] };
	}

	try {
		const credential = parseCredential(token);

		if (!credential) {
			console.warn('Realtime authorizer: credential payload was invalid');
			return { publish: [], subscribe: [] };
		}

		const userId = await resolveUserId(credential.token);

		if (!userId) {
			console.warn('Realtime authorizer: credential did not resolve to a user');
			return { publish: [], subscribe: [] };
		}

		if (credential.userId !== userId) {
			console.warn('Realtime authorizer: credential user did not match token subject');
			return { publish: [], subscribe: [] };
		}

		// TODO: Revisit strictness vs reconnects
		// docs/realtime/reconnect-grace-period.md

		if (credential.scope === 'game') {
			return authorizeGame(prefix, userId, credential.gameId);
		}

		return authorizeMenu(prefix, userId);
	} catch (err) {
		console.error('Realtime authorizer error', err);
		return { publish: [], subscribe: [] };
	}
});
