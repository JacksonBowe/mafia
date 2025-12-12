import { withActor } from '@mafia/core/actor';
import { AuthError } from '@mafia/core/error';
import { createClient } from '@openauthjs/openauth/client';
import { InvalidAccessTokenError } from '@openauthjs/openauth/error';
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst/resource';

export const client = createClient({
    clientID: 'web-app',
    issuer: Resource.UNSAuth.url
})

export const authorize: MiddlewareHandler = async (c, next) => {
    try {
        const authHeader = c.req.header('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new HTTPException(401, { message: 'Missing or invalid Authorization header' })
        }

        const token = authHeader.split(' ')[1]

        const claims = await client.verify(subjects, token)

        if (!claims.err) {
            return withActor({
                type: 'internal_user',
                properties: {
                    userId: claims.subject.properties.userId
                }
            }, () => next())
        } else {
            throw claims.err
        }

    } catch (err) {
        if (err instanceof (InvalidAccessTokenError)) throw new AuthError('invalid_access_token', 'Unauthorized')
        else throw new HTTPException(401, { message: 'Authorization Error' })
    }
}
