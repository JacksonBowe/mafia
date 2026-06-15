import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// bots.local.json holds the raw API keys for each bot user.
// The DB only stores key hashes; the raw keys live here (git-ignored).
// ---------------------------------------------------------------------------

const BotKeySchema = z.object({
	label: z.string().min(1),
	key: z.string().min(1),
});
export type BotKey = z.infer<typeof BotKeySchema>;

const BotKeysSchema = z.array(BotKeySchema).min(1);

export async function loadBotKeys(): Promise<BotKey[]> {
	const dir = dirname(fileURLToPath(import.meta.url));
	const path = join(dir, '..', 'bots.local.json');

	let raw: string;
	try {
		raw = await readFile(path, 'utf-8');
	} catch {
		throw new Error(
			`Missing bots.local.json at ${path}. Copy bots.example.json and fill in raw API keys.`,
		);
	}

	return BotKeysSchema.parse(JSON.parse(raw) as unknown);
}
