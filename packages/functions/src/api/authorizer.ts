import { withActor } from '@mafia/core/actor';
import { AuthError } from '@mafia/core/error';
import { createClient } from '@openauthjs/openauth/client';
import { InvalidAccessTokenError } from '@openauthjs/openauth/error';
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst/resource';
import { subjects } from '../subjects';

export const client = createClient({
    clientID: 'web-app',
    issuer: Resource.Auth.url
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
                type: 'user',
                properties: {
                    userId: claims.subject.properties.userId
                }
            }, () => next())
        } else {
            console.log('Token verification failed:', claims.err)
            throw claims.err
        }

    } catch (err) {
        console.error('Authorization error:', err)
        if (err instanceof (InvalidAccessTokenError)) throw new AuthError('invalid_access_token', 'Unauthorized')
        else throw new HTTPException(401, { message: 'Authorization Error' })
    }
}
