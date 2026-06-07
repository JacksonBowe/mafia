import { GameTopics } from '@mafia/core/game/schema';
import { createClient } from '@mafia/sdk';
import { z } from 'zod';
import { BotRealtime, type RealtimeMessage } from './realtime';

// ---------------------------------------------------------------------------
// A "target dummy" bot: it authenticates, joins a lobby, and connects to
// realtime exactly like a real user. It only listens/logs for now and takes
// no game actions.
// ---------------------------------------------------------------------------

const LobbyStartedSchema = z.object({
	lobbyId: z.string(),
	gameId: z.string(),
});

export type BotConfig = {
	label: string;
	apiKey: string;
	lobbyId: string;
	apiUrl: string;
	realtime: {
		endpoint: string;
		authorizer: string;
		prefix: string;
	};
};

export async function runBot(cfg: BotConfig): Promise<void> {
	const log = (msg: string, extra?: unknown): void => {
		if (extra !== undefined) console.log(`[${cfg.label}] ${msg}`, extra);
		else console.log(`[${cfg.label}] ${msg}`);
	};

	const client = createClient({
		baseUrl: cfg.apiUrl,
		getApiKey: () => cfg.apiKey,
	});

	const me = await client.getMe();
	log(`authenticated as ${me.name} (${me.id})`);

	const subscribedGames = new Set<string>();

	const handleMessage = async (msg: RealtimeMessage): Promise<void> => {
		log(`event ${msg.type}`, msg.properties);

		if (msg.type !== 'lobby.started') return;

		const { gameId } = LobbyStartedSchema.parse(msg.properties);
		if (subscribedGames.has(gameId)) return;
		subscribedGames.add(gameId);

		// Fetch our actor so we can subscribe to our private actor channel.
		const game = await client.getGame();
		if (!game) {
			log('lobby.started received but getGame() returned null');
			return;
		}

		realtime.subscribe(GameTopics.public(game.info.id));
		realtime.subscribe(GameTopics.actor(game.info.id, game.actor.id));
		log(`joined game ${game.info.id} as actor ${game.actor.id} (#${game.actor.number})`);
	};

	const realtime = new BotRealtime({
		endpoint: cfg.realtime.endpoint,
		authorizer: cfg.realtime.authorizer,
		prefix: cfg.realtime.prefix,
		apiKey: cfg.apiKey,
		clientId: `bot_${me.id}_${Date.now()}`,
		label: cfg.label,
		onMessage: (msg) => {
			handleMessage(msg).catch((err: unknown) => log('message handler error', err));
		},
	});

	await realtime.connect();

	// Subscribe before joining so we don't miss the lobby.started event.
	realtime.subscribe(`lobby/${cfg.lobbyId}`);

	await client.joinLobby({ lobbyId: cfg.lobbyId });
	log(`joined lobby ${cfg.lobbyId}`);
}
