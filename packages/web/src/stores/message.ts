import { defineStore } from 'pinia';

export const useChatStore = defineStore('chat', {
	state: () => ({
		channel: 'GLOBAL',
	}),

	getters: {},

	actions: {},
});
