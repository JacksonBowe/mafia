import { createClient } from '@openauthjs/openauth/client';
import { topicPrefix } from '@mafia/core/realtime';
import { Resource } from 'sst';
import { realtime } from 'sst/aws/realtime';
import { subjects } from '../subjects';

const client = createClient({
	clientID: 'web-app',
	issuer: Resource.Auth.url,
});

export const handler = realtime.authorizer(async (token) => {
	const prefix = topicPrefix();

	if (!token) {
		return { publish: [], subscribe: [] };
	}

	try {
		const claims = await client.verify(subjects, token);
		if (claims.err) {
			console.warn('Realtime token verification failed', { err: claims.err });
			return { publish: [], subscribe: [] };
		}

		// TODO: Revisit strictness vs reconnects
		// docs/realtime/reconnect-grace-period.md

		const userId = claims.subject.properties.userId;

		const subscribe = new Set<string>();
		subscribe.add(`${prefix}/chat/menu/global`);
		subscribe.add(`${prefix}/chat/menu/lobby/*`);
		subscribe.add(`${prefix}/chat/menu/private/${userId}`);
		subscribe.add(`${prefix}/lobby/*`);

		return {
			publish: [`${prefix}/$disconnect`],
			subscribe: [...subscribe],
		};
	} catch (err) {
		console.error('Realtime authorizer error', err);
		return { publish: [], subscribe: [] };
	}
});
