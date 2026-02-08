import { EventBus } from 'quasar';
import type { z } from 'zod';

type CallbackMap = Record<string, (payload: unknown) => void>;
export type SchemaMap = Record<string, z.ZodType<unknown>>;

export function createBus<const R extends SchemaMap>(schemas: R) {
	const qbus = new EventBus<CallbackMap>();

	function on<K extends keyof R & string>(type: K, handler: (payload: z.infer<R[K]>) => void) {
		const wrapped = (payload: unknown) => handler(payload as z.infer<R[K]>);
		qbus.on(type, wrapped);
		return () => qbus.off(type, wrapped);
	}

	function emit<K extends keyof R & string>(type: K, payload: unknown) {
		const schema = schemas[type];

		if (!schema) {
			console.log('[realtime] Unknown event', { type });
			return false;
		}

		const parsed = schema.safeParse(payload);
		if (!parsed.success) {
			console.warn('[bus] Invalid payload', { type, issues: parsed.error.issues });
			return false;
		}
		qbus.emit(type, parsed.data);
		return true;
	}

	function emitFromRealtime(backendType: string, properties: unknown) {
		const type = `realtime.${backendType}`;
		const schema = (schemas as Record<string, z.ZodType<unknown>>)[type];

		if (!schema) {
			console.log('[realtime] Unknown event', { type: backendType });
			return false;
		}

		const parsed = schema.safeParse(properties);
		if (!parsed.success) {
			console.warn('[realtime] Invalid payload', {
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

export type Bus<R extends SchemaMap> = ReturnType<typeof createBus<R>>;
