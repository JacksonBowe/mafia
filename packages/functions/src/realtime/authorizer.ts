import { createClient } from '@openauthjs/openauth/client';
import { topicPrefix } from '@mafia/core/realtime';
import { User } from '@mafia/core/user/index';
import { Resource } from 'sst';
import { realtime } from 'sst/aws/realtime';
import { subjects } from '../subjects';

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

export const handler = realtime.authorizer(async (token) => {
	const prefix = topicPrefix();

	if (!token) {
		return { publish: [], subscribe: [] };
	}

	try {
		const userId = await resolveUserId(token);

		if (!userId) {
			console.warn('Realtime authorizer: credential did not resolve to a user');
			return { publish: [], subscribe: [] };
		}

		// TODO: Revisit strictness vs reconnects
		// docs/realtime/reconnect-grace-period.md

		const subscribe = new Set<string>();
		subscribe.add(`${prefix}/chat/menu/global`);
		subscribe.add(`${prefix}/chat/menu/lobby/*`);
		subscribe.add(`${prefix}/chat/menu/private/${userId}`);
		subscribe.add(`${prefix}/chat/game/*`);
		subscribe.add(`${prefix}/lobby/*`);
		subscribe.add(`${prefix}/game/*`);

		return {
			publish: [`${prefix}/$disconnect`],
			subscribe: [...subscribe],
		};
	} catch (err) {
		console.error('Realtime authorizer error', err);
		return { publish: [], subscribe: [] };
	}
});
