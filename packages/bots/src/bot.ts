import { BotSession } from './session';
import type { RealtimeConfig } from './types';

// ---------------------------------------------------------------------------
// A "target dummy" bot: it authenticates, joins a lobby, and connects to
// realtime exactly like a real user. It only listens/logs for now and takes
// no game actions.
// ---------------------------------------------------------------------------

export type BotConfig = {
	label: string;
	apiKey: string;
	lobbyId: string;
	apiUrl: string;
	realtime: RealtimeConfig;
};

export async function runBot(cfg: BotConfig): Promise<void> {
	const session = new BotSession({
		...cfg,
		onLog: (entry) => {
			if (entry.extra !== undefined)
				console.log(`[${entry.label}] ${entry.message}`, entry.extra);
			else console.log(`[${entry.label}] ${entry.message}`);
		},
	});
	await session.joinLobby();
}
