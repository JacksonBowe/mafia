import { assertActor } from '@mafia/core/actor';
import { User } from '@mafia/core/user/index';
import { Hono } from 'hono';

type Bindings = {};

const metaRoutes = new Hono<{ Bindings: Bindings }>();

/**
 * Meta: Get Me
 */

metaRoutes.get('/me', async (c) => {
    const user = await User.get({ userId: assertActor('user').properties.userId });
    return c.json(user);
});

metaRoutes.get('/precense', async (c) => {
    // try {
    const presence = await User.getPresence({ userId: assertActor('user').properties.userId });
    return c.json(presence);
    // } catch (error) {
    //     console.error('Error fetching presence', error);

    // }


});

export { metaRoutes };

