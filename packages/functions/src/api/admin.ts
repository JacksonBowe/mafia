
import { assertActor } from '@mafia/core/actor';
import { Lobby } from '@mafia/core/lobby/index';
import { Hono } from 'hono';

type Bindings = {};

const adminRoutes = new Hono<{ Bindings: Bindings }>();

adminRoutes.post('/terminate-lobbies', async (c) => {
    const actor = assertActor('user');
    console.log(actor)
    if (!actor.properties.isAdmin) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    const lobbies = await Lobby.list();

    await Promise.all(lobbies.map(async (lobby) => {
        console.log(`Terminating lobby ${lobby.id} (${lobby.name}) by admin ${actor.properties.userId}`);

        await Lobby.terminate({ lobbyId: lobby.id });


        // Delete the lobby
        console.log(`Lobby ${lobby.id} terminated.`);
    }));

    return c.json({ message: 'All lobbies terminated.' });
})

export { adminRoutes };
