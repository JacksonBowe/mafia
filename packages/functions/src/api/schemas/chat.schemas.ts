import { z } from 'zod';
import { MenuChannelSchema } from '@mafia/core/message';

// ---------------------------------------------------------------------------
// Request Bodies
// ---------------------------------------------------------------------------

export const SendChatMessageJsonSchema = z.object({
	text: z.string().min(1).max(2000),
	channel: MenuChannelSchema,
});
export type SendChatMessageJson = z.infer<typeof SendChatMessageJsonSchema>;
