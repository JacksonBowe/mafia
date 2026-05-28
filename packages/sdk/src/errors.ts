import type { AxiosError } from 'axios';

/**
 * Wraps an Axios error into a structured SDK error.
 */
export class ApiError extends Error {
	public readonly status: number | undefined;
	public readonly code: string | undefined;
	public readonly details: unknown;

	constructor(err: AxiosError<{ code?: string; message?: string; details?: unknown }>) {
		const data = err.response?.data;
		super(data?.message ?? err.message);
		this.name = 'ApiError';
		this.status = err.response?.status;
		this.code = data?.code;
		this.details = data?.details;
	}
}
