// scripts/createBots.ts
//
// One-shot: wipe all bot users and recreate a fixed pool of bots, each with a
// single API key. Prints the raw keys to STDOUT in the shape expected by
// packages/bots/bots.local.json. Raw keys are never stored in the DB (only the
// SHA-256 hash is), so this output is your only chance to capture them.
//
//   bun run create-bots > ../bots/bots.local.json
//
import { closeDb, createTransaction, eq } from '@mafia/core/db/index';
import { User } from '@mafia/core/user/index';
import { userApiKeyTable, userTable } from '@mafia/core/user/user.sql';
import { randomBytes } from 'node:crypto';
import { ulid } from 'ulid';

const BOT_COUNT = 14;

type BotKeyOutput = { label: string; key: string };

/** Generate an opaque, URL-safe raw API key. */
function generateRawKey(): string {
	return `botkey_${randomBytes(24).toString('base64url')}`;
}

async function createBots(): Promise<BotKeyOutput[]> {
	return createTransaction(async (tx) => {
		// Cascade on user_api_key.user_id removes each bot's keys automatically.
		const deleted = await tx
			.delete(userTable)
			.where(eq(userTable.isBot, true))
			.returning({ id: userTable.id });
		console.error(`🗑️  Deleted ${deleted.length} existing bot user(s)`);

		const output: BotKeyOutput[] = [];

		for (let i = 1; i <= BOT_COUNT; i++) {
			const nn = String(i).padStart(2, '0');
			const userId = ulid();

			await tx.insert(userTable).values({
				id: userId,
				discordId: `bot-${nn}`,
				name: `Bot ${nn}`,
				isBot: true,
			});

			const rawKey = generateRawKey();

			await tx.insert(userApiKeyTable).values({
				id: ulid(),
				userId,
				keyHash: User.ApiKey.hashApiKey(rawKey),
				name: `Bot ${nn} key`,
			});

			output.push({ label: `bot-${nn}`, key: rawKey });
			console.error(`✅ Created Bot ${nn} (${userId})`);
		}

		return output;
	});
}

createBots()
	.then(async (output) => {
		await closeDb();
		console.error(`\n✅ Created ${output.length} bots. bots.local.json contents below:\n`);
		// STDOUT: pure JSON only, so it can be piped straight into bots.local.json.
		console.log(JSON.stringify(output, null, 2));
	})
	.catch(async (err) => {
		console.error('❌ Bot creation failed:', err);
		await closeDb();
		process.exit(1);
	});
