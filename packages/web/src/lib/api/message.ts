import { z } from 'zod';

// Define the base schema for a message
const BaseMessageSchema = z.object({
	sender: z.object({
		id: z.string(),
		name: z.string(),
	}),
	content: z.string(),
	timestamp: z.date().optional(), // Optional timestamp
});

// Define the schema for GLOBAL messages
const GlobalMessageSchema = BaseMessageSchema.extend({
	type: z.literal('GLOBAL'),
	target: z.literal('GLOBAL'),
});

// Define the schema for LOBBY messages
const LobbyMessageSchema = BaseMessageSchema.extend({
	type: z.literal('LOBBY'),
	target: z.string(), // Lobby ID or name
});

// Define the schema for PRIVATE messages
const PrivateMessageSchema = BaseMessageSchema.extend({
	type: z.literal('PRIVATE'),
	target: z.string(), // User ID or name
});

// Union schema to handle all message types
export const MessageSchema = z.union([
	GlobalMessageSchema,
	LobbyMessageSchema,
	PrivateMessageSchema,
]);
