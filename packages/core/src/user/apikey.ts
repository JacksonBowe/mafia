import { and, eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { useTransaction } from '../db/transaction';
import { AuthError } from '../error';
import { fn } from '../util/fn';
import { UserErrors as Errors, UserInfoSchema } from './schema';
import { userApiKeyTable, userTable } from './user.sql';

export { Errors };

/** Hash a raw API key into the digest stored in the database. */
export function hashApiKey(apiKey: string): string {
	return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Resolve the user that owns a given raw API key.
 * Throws an AuthError when the key is unknown or disabled.
 *
 * The request flow downstream is identical to a normal authenticated user;
 * an API key is just an alternate credential that maps to a user row.
 */
export const getUserForKey = fn(
	z.object({ apiKey: z.string().min(1) }),
	async ({ apiKey }) =>
		useTransaction(async (tx) => {
			const keyHash = hashApiKey(apiKey);

			const [row] = await tx
				.select({ user: userTable })
				.from(userApiKeyTable)
				.innerJoin(userTable, eq(userTable.id, userApiKeyTable.userId))
				.where(and(eq(userApiKeyTable.keyHash, keyHash), eq(userApiKeyTable.enabled, true)))
				.limit(1);

			if (!row) {
				throw new AuthError(Errors.ApiKeyInvalid, 'Invalid API key');
			}

			return UserInfoSchema.parse(row.user);
		}),
);
