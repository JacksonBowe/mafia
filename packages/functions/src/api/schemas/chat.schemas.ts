import { z } from 'zod';
import { MenuChannelSchema } from '@mafia/core/message';

// ---------------------------------------------------------------------------
// Request Bodies
// ---------------------------------------------------------------------------

const SendMenuChatMessageJsonSchema = z.object({
	text: z.string().min(1).max(2000),
	channel: MenuChannelSchema,
});

const SendGameChatMessageJsonSchema = z.object({
	text: z.string().min(1).max(2000),
	scope: z.literal('game'),
});

export const SendChatMessageJsonSchema = z.union([
	SendMenuChatMessageJsonSchema,
	SendGameChatMessageJsonSchema,
]);
export type SendChatMessageJson = z.infer<typeof SendChatMessageJsonSchema>;
