// src/lib/bus.ts
import { EventBus } from "quasar";
import type { z } from "zod";

type CallbackMap = Record<string, (payload: unknown) => void>;
export type SchemaMap = Record<string, z.ZodType<unknown>>;

export type Bus<R extends SchemaMap> = ReturnType<typeof createBus<R>>;

/**
 * Create a typed + validating bus from a schema registry.
 *
 * You should construct the registry in your boot file by merging domain maps:
 *   const schemas = { ...LobbyEventSchemas, ...GameEventSchemas } as const;
 *   export const bus = createBus(schemas);
 */
export function createBus<const R extends SchemaMap>(schemas: R) {
    const qbus = new EventBus<CallbackMap>();

    function on<K extends keyof R & string>(
        type: K,
        handler: (payload: z.infer<R[K]>) => void,
    ) {
        const wrapped = (payload: unknown) => {
            // payload is already validated at emit-time; this cast keeps the handler typed.
            handler(payload as z.infer<R[K]>);
        };

        qbus.on(type, wrapped);
        return () => qbus.off(type, wrapped);
    }

    function emit<K extends keyof R & string>(type: K, payload: unknown) {
        const schema = schemas[type];
        if (!schema) {
            console.log("[bus] Unknown event", { type });
            return false;
        }

        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
            console.warn("[bus] Invalid payload", {
                type,
                issues: parsed.error.issues,
            });
            return false;
        }

        qbus.emit(type, parsed.data);
        return true;
    }

    /**
     * Bridge from backend realtime message -> Quasar bus.
     *
     * backendType is unprefixed (eg "lobby.member.join")
     * bus event is prefixed      (eg "realtime.lobby.member.join")
     */
    function emitFromRealtime(backendType: string, properties: unknown) {
        const type = `realtime.${backendType}` as keyof R & string;

        const schema = schemas[type];
        if (!schema) {
            console.log("[realtime] Unknown event", { type: backendType });
            return false;
        }

        const parsed = schema.safeParse(properties);
        if (!parsed.success) {
            console.warn("[realtime] Invalid payload", {
                type: backendType,
                issues: parsed.error.issues,
            });
            return false;
        }

        qbus.emit(type, parsed.data);
        return true;
    }

    return { on, emit, emitFromRealtime };
}
