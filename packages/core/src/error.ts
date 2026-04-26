// ---------------------------------------------------------------------------
// Server-only error machinery.
// Pure error contracts (PublicErrorSchema, ULID helpers, zBoolQuery) live in
// ./error/schema and are re-exported here for backend convenience.
// ---------------------------------------------------------------------------
import { zValidator as zv } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';
import type { PublicErrorPayload } from './error/schema';

// Re-export pure pieces so existing backend imports continue to work.
export { PublicErrorSchema, isULID, zBoolQuery } from './error/schema';
export type { PublicErrorPayload, ULID } from './error/schema';

export const zValidator = <T extends z.ZodType, Target extends keyof ValidationTargets>(
	target: Target,
	schema: T,
) =>
	zv(target, schema, (result) => {
		if (!result.success) {
			throw new InputError(
				'validation_error',
				`Invalid input: ${target}`,
				result.error.issues,
			);
		}
	});

/**
 * Server-side error class. The HTTP layer serialises instances of this class
 * into JSON conforming to {@link PublicErrorSchema}.
 */
export class PublicError extends HTTPException implements PublicErrorPayload {
	constructor(
		public override status: ContentfulStatusCode,
		public code: string,
		public override message: string,
		public details?: unknown,
	) {
		super(status, { message });
	}
}

export class InputError extends PublicError {
	constructor(code: string, message: string, details?: unknown) {
		super(400, code, message, details);
	}
}

export class AuthError extends PublicError {
	constructor(code: string, message: string, details?: unknown) {
		super(401, code, message, details);
	}
}

export class ServerError extends PublicError {
	constructor(code: string, message: string, details?: unknown) {
		super(500, code, message, details);
	}
}

export class UnhandledServerError extends ServerError {
	constructor(message: string, details?: unknown) {
		super('unhandled_exception', message, details);
	}
}
