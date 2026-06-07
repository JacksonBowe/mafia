import { topicPrefix } from '@mafia/core/realtime';
import { parseArgs } from 'node:util';
import { Resource } from 'sst';
import { runBot } from './bot';
import { loadBotKeys } from './config';

// ---------------------------------------------------------------------------
// CLI entrypoint. Run inside an SST shell so Resource bindings are injected:
//
//   bunx sst shell -- bun run src/index.ts --lobby-id <id> --count 2
//   bunx sst shell -- bun run src/index.ts --lobby-id <id> --keys bot-1,bot-2
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: {
			'lobby-id': { type: 'string' },
			count: { type: 'string' },
			keys: { type: 'string' },
		},
	});

	const lobbyId = values['lobby-id'];
	if (!lobbyId) throw new Error('Missing required --lobby-id <id>');

	const allKeys = await loadBotKeys();

	let selected = allKeys;
	if (values.keys) {
		const wanted = values.keys.split(',').map((s) => s.trim());
		selected = allKeys.filter((k) => wanted.includes(k.label));
	}
	if (values.count) {
		const n = Number.parseInt(values.count, 10);
		if (Number.isNaN(n) || n < 1) throw new Error(`Invalid --count: ${values.count}`);
		selected = selected.slice(0, n);
	}
	if (selected.length === 0) throw new Error('No bot keys selected');

	const apiUrl = Resource.Api.url;
	const realtime = {
		endpoint: Resource.Realtime.endpoint,
		authorizer: Resource.Realtime.authorizer,
		prefix: topicPrefix(),
	};

	console.log(`Starting ${selected.length} bot(s) for lobby ${lobbyId}`);

	const results = await Promise.all(
		selected.map((k) =>
			runBot({ label: k.label, apiKey: k.key, lobbyId, apiUrl, realtime })
				.then(() => true)
				.catch((err: unknown) => {
					console.error(`[${k.label}] failed:`, err);
					return false;
				}),
		),
	);

	const ok = results.filter(Boolean).length;
	const failed = results.length - ok;

	if (ok === 0) {
		console.error(`All ${results.length} bot(s) failed to start.`);
		process.exit(1);
	}

	console.log(
		`${ok} bot(s) connected${failed ? `, ${failed} failed` : ''}. ` +
			'Listening for realtime events (Ctrl+C to exit).',
	);
}

main().catch((err: unknown) => {
	console.error('Fatal:', err);
	process.exit(1);
});
