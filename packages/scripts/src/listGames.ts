import { closeDb } from '@mafia/core/db';
import { isULID } from '@mafia/core/error/schema';
import { Game } from '@mafia/core/game/index';
import { GameStatusSchema } from '@mafia/core/game/schema';
import { parseArgs } from 'node:util';
import { z } from 'zod';

const ListGamesArgsSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(10),
	cursor: isULID().optional(),
	order: z.enum(['asc', 'desc']).default('desc'),
	status: GameStatusSchema.optional(),
});

const { values } = parseArgs({
	options: {
		limit: { type: 'string', default: '10' },
		cursor: { type: 'string' },
		order: { type: 'string', default: 'desc' },
		status: { type: 'string' },
	},
});

const args = ListGamesArgsSchema.parse(values);

async function listGames() {
	console.error(`Listing ${args.limit} game(s), ${args.order} by creation time`);
	console.log(JSON.stringify(await Game.list(args), null, 2));
}

listGames()
	.catch((error) => {
		console.error('Failed to list games:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await closeDb();
	});
