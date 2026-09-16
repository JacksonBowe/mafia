import { closeDb } from '@mafia/core/db';
import { isULID } from '@mafia/core/error/schema';
import { Game } from '@mafia/core/game/index';
import { parseArgs } from 'node:util';
import { z } from 'zod';

const QueryGameLogsArgsSchema = z
	.object({
		'game-id': isULID().optional(),
		recent: z.coerce.number().int().min(1).max(100).optional(),
		kind: z.enum(['audit', 'engine', 'all']).default('all'),
		limit: z.coerce.number().int().min(1).max(500).default(100),
	})
	.superRefine((input, ctx) => {
		if (input['game-id'] && input.recent !== undefined) {
			ctx.addIssue({
				code: 'custom',
				message: '--game-id and --recent cannot be used together',
				path: ['game-id'],
			});
		}
		if (!input['game-id'] && input.recent === undefined) {
			ctx.addIssue({
				code: 'custom',
				message: '--game-id or --recent is required',
			});
		}
	})
	.transform(({ 'game-id': gameId, recent, kind, limit }) => ({ gameId, recent, kind, limit }));

const { values } = parseArgs({
	options: {
		'game-id': { type: 'string' },
		recent: { type: 'string' },
		kind: { type: 'string', default: 'all' },
		limit: { type: 'string', default: '100' },
	},
});

const args = QueryGameLogsArgsSchema.parse(values);

async function readAll<T>(
	readPage: (cursor?: string) => Promise<{ items: T[]; meta: { nextCursor: string | null } }>,
) {
	const items: T[] = [];
	let cursor: string | undefined;

	do {
		const page = await readPage(cursor);
		items.push(...page.items);
		cursor = page.meta.nextCursor ?? undefined;
	} while (cursor);

	return items;
}

async function queryLogsForGame(gameId: string) {
	const output: Record<string, unknown> = { gameId };

	if (args.kind === 'audit' || args.kind === 'all') {
		output.audit = await readAll((cursor) =>
			Game.Session.Log.listGameLogs({ gameId, limit: args.limit, cursor }),
		);
	}
	if (args.kind === 'engine' || args.kind === 'all') {
		output.engine = await readAll((cursor) =>
			Game.Session.Log.listEngineLogs({ gameId, limit: args.limit, cursor }),
		);
	}

	return output;
}

async function queryGameLogs() {
	if (args.gameId) {
		console.error(`Querying ${args.kind} logs for game ${args.gameId}`);
		console.log(JSON.stringify(await queryLogsForGame(args.gameId), null, 2));
		return;
	}

	console.error(`Querying ${args.kind} logs for ${args.recent} most recent game(s)`);
	const page = await Game.list({ limit: args.recent, order: 'desc' });
	const logs = [];
	for (const game of page.items) {
		logs.push({ game, ...(await queryLogsForGame(game.id)) });
	}
	console.log(JSON.stringify({ games: logs }, null, 2));
}

queryGameLogs()
	.catch((error) => {
		console.error('Failed to query game logs:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await closeDb();
	});
