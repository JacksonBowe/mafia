import { describe, expect, it } from 'vitest';
import { createClient } from '../src/client';
import type { ApiClient } from '../src/client';

describe('createClient', () => {
	it('returns an object with all domain methods', () => {
		const client = createClient({ baseUrl: 'http://localhost:3000' });

		// Lobby
		expect(typeof client.createLobby).toBe('function');
		expect(typeof client.listLobbies).toBe('function');
		expect(typeof client.getLobby).toBe('function');
		expect(typeof client.joinLobby).toBe('function');
		expect(typeof client.leaveLobby).toBe('function');
		expect(typeof client.startLobby).toBe('function');

		// Chat
		expect(typeof client.sendMessage).toBe('function');

		// Meta
		expect(typeof client.getMe).toBe('function');
		expect(typeof client.getPresence).toBe('function');

		// Game
		expect(typeof client.getGame).toBe('function');

		// Admin
		expect(typeof client.terminateLobbies).toBe('function');
		expect(typeof client.terminateGames).toBe('function');
	});

	it('exposes the underlying axios instance', () => {
		const client = createClient({ baseUrl: 'http://localhost:3000' });
		expect(client.axios).toBeDefined();
		expect(typeof client.axios.request).toBe('function');
	});

	it('attaches Authorization header when getAccessToken is provided', async () => {
		const client = createClient({
			baseUrl: 'http://localhost:3000',
			getAccessToken: () => 'test-token',
		});

		// Mock the adapter to capture the request config without making a real call
		let capturedAuth: string | undefined;
		client.axios.defaults.adapter = (config) => {
			capturedAuth = config.headers?.Authorization as string | undefined;
			return Promise.resolve({
				data: {},
				status: 200,
				statusText: 'OK',
				headers: {},
				config,
			});
		};

		await client.getMe();

		expect(capturedAuth).toBe('Bearer test-token');
	});

	it('satisfies the ApiClient type', () => {
		const client = createClient({ baseUrl: 'http://localhost:3000' });
		const _typed: ApiClient = client;
		expect(_typed).toBeDefined();
	});
});
