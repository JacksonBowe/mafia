import { boot } from 'quasar/wrappers';
import { createBus } from 'src/lib/bus';
import { ChatEventSchemas } from 'src/lib/chat/events';
import { GameEventSchemas } from 'src/lib/game/events';
import { LobbyEventSchemas } from 'src/lib/lobby/events';

const schemas = {
	...ChatEventSchemas,
	...GameEventSchemas,
	...LobbyEventSchemas,
} as const;

export const bus = createBus(schemas);

export type AppBus = typeof bus;

export default boot(({ app }) => {
	app.provide('bus', bus);
});
