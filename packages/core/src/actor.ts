// packages/core/src/actor.ts

import { z } from 'zod';
import { createContext } from './context';

export const SystemActor = z.object({
	type: z.literal('system'),
});

export const AdminUserActor = z.object({
	type: z.literal('admin'),
	properties: z.object({
		userId: z.string(),
	}),
});

export const UserActor = z.object({
	type: z.literal('user'),
	properties: z.object({
		userId: z.string(),
		isAdmin: z.boolean().default(false),
	}),
});

export const PublicActor = z.object({
	type: z.literal('public'),
	properties: z.object({}),
});

export const Actor = z.discriminatedUnion('type', [
	SystemActor,
	AdminUserActor,
	UserActor,
	PublicActor,
]);
export type Actor = z.infer<typeof Actor>;

export const ActorContext = createContext<Actor>();

export const useActor = ActorContext.use;
export const withActor = ActorContext.with;

export function assertActor<T extends Actor['type']>(type: T) {
	const actor = useActor();
	if (actor.type !== type) {
		throw new Error(`Expected actor type ${type}, got ${actor.type}`);
	}

	return actor as Extract<Actor, { type: T }>;
}
