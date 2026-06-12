import { GameTopics } from '@mafia/core/game/schema';
import { createClient, type ApiClient, type GameSyncResponse, type LobbyInfo } from '@mafia/sdk';
import { z } from 'zod';
import { BotRealtime, type RealtimeMessage } from './realtime';
import type { BotLogEntry, BotSessionConfig, BotSnapshot, BotStatus } from './types';

const LobbyStartedSchema = z.object({
	lobbyId: z.string(),
	gameId: z.string(),
});

export class BotSession {
	private readonly cfg: BotSessionConfig;
	private readonly client: ApiClient;
	private realtime: BotRealtime | null = null;
	private status: BotStatus = 'idle';
	private user: BotSnapshot['user'] = null;
	private lobby: LobbyInfo | null = null;
	private game: GameSyncResponse | null = null;
	private lastError: string | null = null;
	private lobbyId: string | null;
	private readonly logs: BotLogEntry[] = [];
	private readonly subscribedGames = new Set<string>();

	constructor(cfg: BotSessionConfig) {
		this.cfg = cfg;
		this.lobbyId = cfg.lobbyId ?? null;
		this.client = createClient({
			baseUrl: cfg.apiUrl,
			getApiKey: () => cfg.apiKey,
		});
	}

	snapshot(): BotSnapshot {
		return {
			label: this.cfg.label,
			status: this.status,
			user: this.user,
			lobby: this.lobby,
			game: this.game,
			lastError: this.lastError,
			logs: [...this.logs],
		};
	}

	async connect(): Promise<void> {
		if (this.realtime) return;

		this.setStatus('authenticating');
		this.user = await this.client.getMe();
		this.log(`authenticated as ${this.user.name} (${this.user.id})`);

		this.realtime = new BotRealtime({
			endpoint: this.cfg.realtime.endpoint,
			authorizer: this.cfg.realtime.authorizer,
			prefix: this.cfg.realtime.prefix,
			apiKey: this.cfg.apiKey,
			clientId: `bot_${this.user.id}_${Date.now()}`,
			label: this.cfg.label,
			onStatus: (message) => this.log(message),
			onError: (err) => this.setError(err),
			onMessage: (msg) => {
				this.handleMessage(msg).catch((err: unknown) => this.setError(err));
			},
		});

		await this.realtime.connect();
		if (this.lobbyId) this.realtime.subscribe(`lobby/${this.lobbyId}`);
		this.setStatus('connected');
	}

	async getUserId(): Promise<string> {
		await this.connect();
		if (!this.user) throw new Error('Bot did not authenticate');
		return this.user.id;
	}

	async joinLobby(lobbyId = this.lobbyId): Promise<void> {
		if (!lobbyId) throw new Error('No lobby selected');
		this.lobbyId = lobbyId;
		await this.connect();
		this.realtime?.subscribe(`lobby/${lobbyId}`);
		this.setStatus('joining_lobby');
		await this.client.joinLobby({ lobbyId });
		await this.refresh();
		this.setStatus(this.game ? 'in_game' : 'in_lobby');
		this.log(`joined lobby ${lobbyId}`);
	}

	async leaveLobby(): Promise<void> {
		await this.client.leaveLobby();
		this.lobby = null;
		this.game = null;
		this.setStatus(this.realtime ? 'connected' : 'idle');
		this.log('left lobby');
	}

	async startLobby(lobbyId = this.lobbyId): Promise<void> {
		if (!lobbyId) throw new Error('No lobby selected');
		this.lobbyId = lobbyId;
		const result = await this.client.startLobby({ lobbyId });
		this.log(`started lobby, game ${result.gameId}`);
		await this.refresh();
	}

	async refresh(): Promise<void> {
		this.user ??= await this.client.getMe();
		this.lobby = this.lobbyId
			? await this.client.getLobby({ lobbyId: this.lobbyId }).catch(() => null)
			: null;
		this.game = await this.client.getGame();
		if (this.game) this.subscribeGame(this.game.info.id, this.game.actor.id);
		this.setStatus(
			this.game ? 'in_game' : this.lobby ? 'in_lobby' : this.realtime ? 'connected' : 'idle',
		);
	}

	disconnect(): void {
		this.realtime?.disconnect();
		this.realtime = null;
		this.subscribedGames.clear();
		this.setStatus('disconnected');
		this.log('disconnected');
	}

	private async handleMessage(msg: RealtimeMessage): Promise<void> {
		this.log(`event ${msg.type}`, msg.properties);
		if (msg.type !== 'lobby.started') return;

		const { gameId } = LobbyStartedSchema.parse(msg.properties);
		if (this.subscribedGames.has(gameId)) return;

		const game = await this.client.getGame();
		if (!game) {
			this.log('lobby.started received but getGame() returned null');
			return;
		}

		this.game = game;
		this.subscribeGame(game.info.id, game.actor.id);
		this.setStatus('in_game');
		this.log(`joined game ${game.info.id} as actor ${game.actor.id} (#${game.actor.number})`);
	}

	private subscribeGame(gameId: string, actorId: string): void {
		if (this.subscribedGames.has(gameId)) return;
		this.subscribedGames.add(gameId);
		this.realtime?.subscribe(GameTopics.public(gameId));
		this.realtime?.subscribe(GameTopics.actor(gameId, actorId));
	}

	private setStatus(status: BotStatus): void {
		this.status = status;
		this.cfg.onChange?.();
	}

	private setError(err: unknown): void {
		this.lastError = err instanceof Error ? err.message : String(err);
		this.setStatus('error');
		this.log(this.lastError, err, 'error');
	}

	private log(message: string, extra?: unknown, level: BotLogEntry['level'] = 'info'): void {
		const entry = { at: new Date(), label: this.cfg.label, level, message, extra };
		this.logs.push(entry);
		this.logs.splice(0, Math.max(0, this.logs.length - 200));
		this.cfg.onLog?.(entry);
		this.cfg.onChange?.();
	}
}
