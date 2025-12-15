import type { Handler } from "aws-lambda"
import { Hono } from "hono"
import type { LambdaContext, LambdaEvent } from "hono/aws-lambda"
import { handle } from "hono/aws-lambda"

import { PublicError } from "@mafia/core/error"
import { HTTPException } from "hono/http-exception"
import { authorize } from "./authorizer"
import { metaRoutes } from "./meta"

type Bindings = {
    event: LambdaEvent;
    lambdaContext: LambdaContext;
};

const app = new Hono<{ Bindings: Bindings }>();

// Base route
app.get('/', (c) => c.text('Welcome to the API!'));

const protectedRoutes = app.basePath('/').use('*', authorize);

protectedRoutes.route('/', metaRoutes);

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

    return c.json(
        {
            status: 500,
            code: 'internal_error',
            message: 'Something went wrong',
        },
        500,
    );
});

export const handler: Handler = handle(app);
