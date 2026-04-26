// ---------------------------------------------------------------------------
// Pure error contracts shared across server and client (SDK-safe).
// Must NOT import any infra (sst, hono, drizzle, aws, neondatabase, ws).
// ---------------------------------------------------------------------------
import { z } from 'zod';

// ---------------------------------------------------------------------------
// ULID
// ---------------------------------------------------------------------------

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function isULID() {
	return z.string().regex(ULID_REGEX, {
		message: 'Must be a valid ULID',
	});
}

export type ULID = z.infer<ReturnType<typeof isULID>>;

// ---------------------------------------------------------------------------
// Boolean query string preprocessor
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// PublicError contract
// ---------------------------------------------------------------------------
// Stable shape returned by the API for client-visible errors. The server-side
// PublicError class (see ../error.ts) extends Hono's HTTPException and conforms
// to this schema so the SDK can rely on a single shape.

export const PublicErrorSchema = z.object({
	code: z.string().min(1),
	message: z.string(),
	status: z.number().int().min(100).max(599),
	details: z.unknown().optional(),
});

export type PublicErrorPayload = z.infer<typeof PublicErrorSchema>;
