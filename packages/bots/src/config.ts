import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// bots.*.json holds the raw API keys for each bot user.
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
	const prod = process.env.MAFIA_BOTS_CONFIG === 'prod';
	const file = prod ? 'bots.prod.json' : 'bots.local.json';
	const path = join(dir, '..', file);

	let raw: string;
	try {
		raw = await readFile(path, 'utf-8');
	} catch {
		throw new Error(
			`Missing ${file} at ${path}. Run create-bots or copy bots.example.json and fill in raw API keys.`,
		);
	}

	return BotKeysSchema.parse(JSON.parse(raw) as unknown);
}
