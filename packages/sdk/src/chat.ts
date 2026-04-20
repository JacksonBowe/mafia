import type { AxiosRequestConfig } from 'axios';
import type { SendChatMessageJson } from '@mafia/functions/api/schemas/chat.schemas';

export type RequestFn = <T>(config: AxiosRequestConfig) => Promise<T>;

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type SendChatMessageInput = SendChatMessageJson;

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export const chatMethods = (request: RequestFn) => ({
	sendMessage: (input: SendChatMessageInput): Promise<{ success: boolean }> =>
		request({ method: 'POST', url: '/chat/message', data: input }),
});

export type ChatMethods = ReturnType<typeof chatMethods>;
