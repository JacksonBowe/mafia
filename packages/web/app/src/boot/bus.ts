import { boot } from "quasar/wrappers";
import { createBus } from "src/lib/bus";
import { LobbyEventSchemas } from "src/lib/lobby/events";

const schemas = {
    ...LobbyEventSchemas,
} as const;

export const bus = createBus(schemas);

export type AppBus = typeof bus;

export default boot(({ app }) => {
    app.provide("bus", bus);
});
