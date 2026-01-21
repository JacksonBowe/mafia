// export { DatabaseError } from "@neondatabase/serverless";
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { zValidator as zv } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import { z } from 'zod';

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

export class PublicError extends HTTPException {
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

export function isULID() {
	return z.string().regex(new RegExp(`^[0-9A-HJKMNP-TV-Z]{26}$`), {
		message: `Must be a valid ULID"`,
	});
}

export type ULID = z.infer<ReturnType<typeof isULID>>;

// true/false/1/0/yes/no/on/off (case-insensitive)
// empty/missing -> undefined
export const zBoolQuery = z.preprocess((v) => {
	if (typeof v === 'string') {
		const s = v.trim().toLowerCase();
		if (s === '') return undefined;
		if (['true', '1', 't', 'yes', 'y', 'on'].includes(s)) return true;
		if (['false', '0', 'f', 'no', 'n', 'off'].includes(s)) return false;
		return undefined; // unknown token -> treat as unset
	}
	return v;
}, z.boolean().optional());
