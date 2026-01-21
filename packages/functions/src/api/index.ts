import type { Handler } from 'aws-lambda';
import { Hono } from 'hono';
import type { LambdaContext, LambdaEvent } from 'hono/aws-lambda';
import { handle } from 'hono/aws-lambda';

import { PublicError } from '@mafia/core/error';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';
import { adminRoutes } from './admin';
import { authorize } from './authorizer';
import { lobbyRoutes } from './lobby';
import { metaRoutes } from './meta';

type Bindings = {
	event: LambdaEvent;
	lambdaContext: LambdaContext;
};

const app = new Hono<{ Bindings: Bindings }>();

// Base route
app.get('/', (c) => c.text('Welcome to the API!'));

const protectedRoutes = app.basePath('/').use('*', authorize);

protectedRoutes.route('/', metaRoutes);
protectedRoutes.route('/lobby', lobbyRoutes);
protectedRoutes.route('/admin', adminRoutes);

const isProd = Resource.App.stage === 'prod';

function toError(e: unknown): Error {
	if (e instanceof Error) return e;
	return new Error(typeof e === 'string' ? e : JSON.stringify(e));
}

function requestMeta(c: any) {
	return {
		method: c.req.method,
		path: c.req.path,
		// if you have a request id middleware, prefer that:
		requestId: c.get?.('requestId') ?? c.req.header?.('x-request-id') ?? undefined,
	};
}

app.onError((err, c) => {
	if (err instanceof PublicError) {
		return c.json(
			{
				status: err.status,
				code: err.code,
				message: err.message,
				...(err.details ? { details: err.details } : {}),
			},
			err.status,
		);
	}

	if (err instanceof HTTPException) {
		return c.json(
			{
				status: err.status,
				code: 'http_exception',
				message: err.message,
			},
			err.status,
		);
	}

	// 3) Unknown error => treat as 500
	const e = toError(err);
	const meta = requestMeta(c);

	// Log the *actual* error object so you keep stack + cause
	console.error('Unhandled Error', { ...meta }, e);

	return c.json(
		{
			status: 500,
			code: 'internal_error',
			message: 'Something went wrong',
			...(isProd
				? {}
				: {
						// helpful during dev; avoid in prod
						debug: {
							message: e.message,
							stack: e.stack,
							name: e.name,
						},
					}),
		},
		500,
	);
});

export const handler: Handler = handle(app);
