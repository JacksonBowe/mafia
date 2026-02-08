// src/stores/message.ts
import { defineStore } from 'pinia';
import { uid } from 'quasar';
import type { AppChannel, GameChannel, MenuChannel, Message, MessageScope } from 'src/lib/message';
import { MessageSchema } from 'src/lib/message';

type MessageMeta =
	| { scope: 'app'; channel: AppChannel } // FEEDBACK
	| { scope: 'menu'; channel: MenuChannel; lobbyId?: string }
	| { scope: 'game'; channel: GameChannel; gameId: string; teamId?: string };

function nowMs(): number {
	return Date.now();
}

function removeById(list: Message[], id: string): Message[] {
	return list.filter((m) => m.id !== id);
}

export const useMessageStore = defineStore('message', {
	state: () => ({
		/**
		 * Single list shown in the chat window.
		 */
		messages: [] as Message[],

		/**
		 * Track TTL timers so we can cancel them on clear/remove.
		 */
		ttlTimers: {} as Record<string, number>,
	}),

	getters: {
		/**
		 * Optionally, keep it sorted by createdAt (in case messages arrive out-of-order).
		 * If you already push in order, you can skip this and render `messages` directly.
		 */
		sortedMessages(state): Message[] {
			return [...state.messages].sort((a, b) => a.createdAt - b.createdAt);
		},
	},

	actions: {
		// -------------------------
		// Core ingestion / removal
		// -------------------------

		addMessage(message: Message) {
			// runtime safety: ensures we never store a malformed Message
			const parsed = MessageSchema.parse(message);

			// de-dupe by id
			if (this.messages.some((m) => m.id === parsed.id)) return;

			this.messages.push(parsed);

			// schedule TTL removal
			if (parsed.ttlMs) {
				this._scheduleTtl(parsed.id, parsed.ttlMs);
			}
		},

		removeMessage(id: string) {
			this.messages = removeById(this.messages, id);
			this._clearTtl(id);
		},

		clearAll() {
			Object.keys(this.ttlTimers).forEach((id) => this._clearTtl(id));
			this.messages = [];
		},

		/**
		 * Useful when navigating between menu/game:
		 * - clear only menu messages, etc.
		 */
		clearByScope(scope: MessageScope) {
			// clear timers for removed messages
			for (const m of this.messages) {
				if (m.scope === scope) this._clearTtl(m.id);
			}
			this.messages = this.messages.filter((m) => m.scope !== scope);
		},

		// -------------------------
		// Convenience constructors
		// -------------------------

		info(
			text: string,
			meta: MessageMeta,
			opts?: { ttlMs?: number; ephemeral?: boolean; label?: string },
		) {
			const msg: Message = {
				id: uid(),
				createdAt: nowMs(),
				kind: 'INFO',
				sender: { type: 'SYSTEM', ...(opts?.label ? { label: opts.label } : {}) },
				text,
				scope: meta.scope,
				channel: meta.channel,
				...(meta.scope === 'menu' && meta.lobbyId ? { lobbyId: meta.lobbyId } : {}),
				...(meta.scope === 'game'
					? { gameId: meta.gameId, ...(meta.teamId ? { teamId: meta.teamId } : {}) }
					: {}),
				...(opts?.ttlMs ? { ttlMs: opts.ttlMs } : {}),
				...(opts?.ephemeral !== undefined ? { ephemeral: opts.ephemeral } : {}),
			};

			this.addMessage(msg);
		},

		system(text: string, meta: MessageMeta, opts?: { label?: string }) {
			const msg: Message = {
				id: uid(),
				createdAt: nowMs(),
				kind: 'SYSTEM',
				sender: { type: 'SYSTEM', ...(opts?.label ? { label: opts.label } : {}) },
				text,
				scope: meta.scope,
				channel: meta.channel,
				...(meta.scope === 'menu' && meta.lobbyId ? { lobbyId: meta.lobbyId } : {}),
				...(meta.scope === 'game'
					? { gameId: meta.gameId, ...(meta.teamId ? { teamId: meta.teamId } : {}) }
					: {}),
			};

			this.addMessage(msg);
		},

		user(text: string, meta: MessageMeta, sender: { userId: string; displayName?: string }) {
			const msg: Message = {
				id: uid(),
				createdAt: nowMs(),
				kind: 'USER',
				sender: {
					type: 'USER',
					userId: sender.userId,
					...(sender.displayName ? { displayName: sender.displayName } : {}),
				},
				text,
				scope: meta.scope,
				channel: meta.channel,
				...(meta.scope === 'menu' && meta.lobbyId ? { lobbyId: meta.lobbyId } : {}),
				...(meta.scope === 'game'
					? { gameId: meta.gameId, ...(meta.teamId ? { teamId: meta.teamId } : {}) }
					: {}),
			};

			this.addMessage(msg);
		},

		// -------------------------
		// TTL internals
		// -------------------------

		_scheduleTtl(id: string, ttlMs: number) {
			// replace any existing timer
			this._clearTtl(id);

			const handle = window.setTimeout(() => {
				// make sure the message still exists
				if (this.messages.some((m) => m.id === id)) {
					this.messages = removeById(this.messages, id);
				}
				this._clearTtl(id);
			}, ttlMs);

			this.ttlTimers[id] = handle;
		},

		_clearTtl(id: string) {
			const handle = this.ttlTimers[id];
			if (handle !== undefined) {
				window.clearTimeout(handle);
				delete this.ttlTimers[id];
			}
		},
	},
});
