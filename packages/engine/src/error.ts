import type { EngineErrorCode } from './constants';

/**
 * Stable, code-tagged engine error. The `code` field is part of the public
 * API contract — clients may match on it. Use codes from {@link EngineErrorCodes}.
 */
export class EngineError extends Error {
	constructor(
		public code: EngineErrorCode,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = 'EngineError';
	}
}
