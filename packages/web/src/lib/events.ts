import type { EventBus } from 'quasar';

import { ChatEvents, registerChatEvents } from './chat';
import { LobbyEvents, registerLobbyEvents } from './lobby';

export type Events = LobbyEvents & ChatEvents;

export function registerEvents(bus: EventBus<Events>) {
	registerChatEvents(bus);
	registerLobbyEvents(bus);
}
