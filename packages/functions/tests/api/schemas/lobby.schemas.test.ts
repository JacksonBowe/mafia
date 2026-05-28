import { describe, expect, it } from 'vitest';
import {
	CreateLobbyJsonSchema,
	LobbyIdPathParamsSchema,
} from '../../../src/api/schemas/lobby.schemas';

describe('lobby schemas', () => {
	describe('CreateLobbyJsonSchema', () => {
		it('accepts valid input', () => {
			const result = CreateLobbyJsonSchema.safeParse({ name: 'Test Lobby' });
			expect(result.success).toBe(true);
		});

		it('rejects name shorter than 3 chars', () => {
			const result = CreateLobbyJsonSchema.safeParse({ name: 'ab' });
			expect(result.success).toBe(false);
		});

		it('rejects name longer than 50 chars', () => {
			const result = CreateLobbyJsonSchema.safeParse({ name: 'a'.repeat(51) });
			expect(result.success).toBe(false);
		});

		it('rejects missing name', () => {
			const result = CreateLobbyJsonSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('LobbyIdPathParamsSchema', () => {
		it('accepts valid ULID', () => {
			const result = LobbyIdPathParamsSchema.safeParse({
				lobbyId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid ULID', () => {
			const result = LobbyIdPathParamsSchema.safeParse({ lobbyId: 'not-a-ulid' });
			expect(result.success).toBe(false);
		});

		it('rejects missing lobbyId', () => {
			const result = LobbyIdPathParamsSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});
});
