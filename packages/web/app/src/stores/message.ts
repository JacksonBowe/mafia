import type { Message } from "@mafia/core/message/models";
import { defineStore } from 'pinia';
import { uid } from 'quasar';

interface State {
    channel: 'GLOBAL' | 'LOBBY' | 'PRIVATE';
    messages: Array<Message>;
}

export const useMessageStore = defineStore('message', {
    state: (): State => ({
        channel: 'GLOBAL',
        messages: [],
    }),

    getters: {},

    actions: {
        newInfoMessage(message: string) {
            console.log('newInfoMessage');
            this.messages.push({
                id: uid(),
                content: message,
                type: 'INFO',
                timestamp: Date.now(),
                target: 'self',
            });
        },
    },
});
