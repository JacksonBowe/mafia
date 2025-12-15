import { assertActor } from '@mafia/core/actor';
import { isULID, zValidator } from '@mafia/core/error';
import { Lobby } from '@mafia/core/lobby/index';
import { Hono } from 'hono';
import { z } from 'zod';

type Bindings = {};

const lobbyRoutes = new Hono<{ Bindings: Bindings }>();


// Create
export const CreateLobbyJsonSchema = z.object({ name: z.string().min(3).max(50) });
export type CreateLobbyJson = z.infer<typeof CreateLobbyJsonSchema>;

lobbyRoutes.post('/',
    zValidator('json', CreateLobbyJsonSchema),
    async (c) => {
        const { name } = c.req.valid('json');

        const actor = assertActor('user');
        const lobby = await Lobby.create({
            hostId: actor.properties.userId,
            name,
            config: {},
        })

        return c.json(lobby);
    });


// List
lobbyRoutes.get('/', async (c) => {
    const lobbies = await Lobby.list();
    return c.json(lobbies)
});

// Get
export const GetLobbyParamsSchema = z.object({ lobbyId: isULID() });
lobbyRoutes.get('/:lobbyId',
    zValidator('param', GetLobbyParamsSchema),
    async (c) => {
        const { lobbyId } = c.req.valid('param');

        const lobby = await Lobby.get({ lobbyId });

        return c.json(lobby);
    });

// TODO: Join

// TODO: Leave

// TODO: Start
export { lobbyRoutes };

