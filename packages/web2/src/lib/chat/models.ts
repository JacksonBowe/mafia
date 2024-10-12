import { z } from 'zod';

// Base schema for all messages
const BaseMessageSchema = z.object({
	id: z.string().uuid(), // Unique message ID
	content: z.string(), // Message content
	timestamp: z.number().optional(), // Optional timestamp
	target: z.string(), // Target ID (e.g., lobby, user, or system-wide)
});

// Schema for user-generated messages (GLOBAL, LOBBY, PRIVATE)
const UserMessageSchema = BaseMessageSchema.extend({
	sender: z
		.object({
			id: z.string(),
			username: z.string(),
		})
		.optional(), // Optional sender information
	type: z.enum(['GLOBAL', 'LOBBY', 'PRIVATE']), // Types of user messages
});

// Schema for system-generated messages (SYSTEM, INFO)
const SystemMessageSchema = BaseMessageSchema.extend({
	type: z.enum(['SYSTEM', 'INFO']), // System messages or app-to-user messages
});

// Union schema to handle both user and system messages
export const MessageSchema = z.union([UserMessageSchema, SystemMessageSchema]);

// Infer the TypeScript type from the Zod schema
export type Message = z.infer<typeof MessageSchema>;
