import { describe, expect, it } from 'vitest';
import { SendChatMessageJsonSchema } from '../../../src/api/schemas/chat.schemas';

describe('chat schemas', () => {
	describe('SendChatMessageJsonSchema', () => {
		it('accepts valid input with GLOBAL channel', () => {
			const result = SendChatMessageJsonSchema.safeParse({
				text: 'Hello world',
				channel: 'GLOBAL',
			});
			expect(result.success).toBe(true);
		});

		it('accepts valid input with LOBBY channel', () => {
			const result = SendChatMessageJsonSchema.safeParse({
				text: 'Hello lobby',
				channel: 'LOBBY',
			});
			expect(result.success).toBe(true);
		});

		it('accepts valid input with PRIVATE channel', () => {
			const result = SendChatMessageJsonSchema.safeParse({
				text: 'Hello private',
				channel: 'PRIVATE',
			});
			expect(result.success).toBe(true);
		});

		it('rejects empty text', () => {
			const result = SendChatMessageJsonSchema.safeParse({
				text: '',
				channel: 'GLOBAL',
			});
			expect(result.success).toBe(false);
		});

		it('rejects text over 2000 chars', () => {
			const result = SendChatMessageJsonSchema.safeParse({
				text: 'a'.repeat(2001),
				channel: 'GLOBAL',
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid channel', () => {
			const result = SendChatMessageJsonSchema.safeParse({
				text: 'Hello',
				channel: 'INVALID',
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing fields', () => {
			const result = SendChatMessageJsonSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});
});
