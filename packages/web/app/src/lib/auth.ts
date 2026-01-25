import { createClient } from '@openauthjs/openauth/client';

export const client = createClient({
	clientID: 'web-app',
	issuer: import.meta.env.VITE_AUTH_ENDPOINT!,
});
