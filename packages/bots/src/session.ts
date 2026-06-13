import { GameTopics } from '@mafia/core/game/schema';
import {
	createClient,
	type ActorState,
	type ApiClient,
	type GamePhase,
	type GameSyncResponse,
	type LobbyInfo,
	type Verdict,
} from '@mafia/sdk';
import { z } from 'zod';
import { BotRealtime, type RealtimeMessage } from './realtime';
import type { BotLogEntry, BotSessionConfig, BotSnapshot, BotStatus } from './types';

const LobbyStartedSchema = z.object({
	lobbyId: z.string(),
	gameId: z.string(),
});

const GamePhaseSchema = z.object({
	gameId: z.string(),
	phase: z.string(),
	sequence: z.number().int().optional(),
});

const GameActorSchema = z.object({
	gameId: z.string(),
	actor: z.object({ alive: z.boolean() }).passthrough(),
});

const ACTION_PHASES = new Set<GamePhase>(['poll', 'trial', 'evening']);
const MIN_ACTION_DELAY_MS = 2_000;
const MAX_ACTION_DELAY_MS = 5_000;

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
	private isDead = false;
	private actionTimer: ReturnType<typeof setTimeout> | null = null;
	private pendingActionKey: string | null = null;
	private readonly completedActionKeys = new Set<string>();
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
		if (!this.game) this.isDead = false;
		else this.updateDeadState(!this.game.actor.alive);
		if (this.game) this.subscribeGame(this.game.info.id, this.game.actor.id);
		this.setStatus(
			this.game ? 'in_game' : this.lobby ? 'in_lobby' : this.realtime ? 'connected' : 'idle',
		);
	}

	disconnect(): void {
		this.clearActionTimer();
		this.realtime?.disconnect();
		this.realtime = null;
		this.subscribedGames.clear();
		this.setStatus('disconnected');
		this.log('disconnected');
	}

	private async handleMessage(msg: RealtimeMessage): Promise<void> {
		this.log(`event ${msg.type}`, msg.properties);
		if (msg.type === 'game.actor') {
			this.handleActorUpdate(msg.properties);
			return;
		}

		if (msg.type === 'game.over' || msg.type === 'game.terminated') {
			this.clearActionTimer();
			this.pendingActionKey = null;
			return;
		}

		if (msg.type === 'game.phase') {
			this.handlePhaseChange(msg.properties);
			return;
		}

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
		this.scheduleAutoAction(game.info.id, game.info.phase, String(game.info.syncTs));
	}

	private handlePhaseChange(properties: Record<string, unknown>): void {
		if (this.isDead) return;
		const parsed = GamePhaseSchema.safeParse(properties);
		if (!parsed.success) return;
		const phase = parsed.data.phase as GamePhase;
		this.scheduleAutoAction(
			parsed.data.gameId,
			phase,
			String(parsed.data.sequence ?? Date.now()),
		);
	}

	private handleActorUpdate(properties: Record<string, unknown>): void {
		const parsed = GameActorSchema.safeParse(properties);
		if (!parsed.success) return;
		this.updateDeadState(!parsed.data.actor.alive);
	}

	private updateDeadState(isDead: boolean): void {
		if (!isDead) {
			this.isDead = false;
			return;
		}

		if (this.isDead) return;
		this.isDead = true;
		this.clearActionTimer();
		this.pendingActionKey = null;
		this.log('bot dead, auto-actions disabled');
	}

	private scheduleAutoAction(gameId: string, phase: GamePhase, sequence: string): void {
		if (this.isDead) return;
		if (!ACTION_PHASES.has(phase)) return;

		const key = `${gameId}:${phase}:${sequence}`;
		if (this.pendingActionKey === key) return;

		this.clearActionTimer();
		this.pendingActionKey = key;

		const delay = randomInt(MIN_ACTION_DELAY_MS, MAX_ACTION_DELAY_MS);
		this.log(`auto action scheduled for ${phase} in ${Math.round(delay / 1000)}s`);
		this.actionTimer = setTimeout(() => {
			this.runAutoAction(key).catch((err: unknown) => this.setError(err));
		}, delay);
	}

	private clearActionTimer(): void {
		if (!this.actionTimer) return;
		clearTimeout(this.actionTimer);
		this.actionTimer = null;
	}

	private async runAutoAction(key: string): Promise<void> {
		this.actionTimer = null;
		if (this.isDead) return;

		try {
			await this.refresh();
			if (this.isDead) return;
			const didAct = await this.takeRandomAction();
			this.completedActionKeys.add(this.currentActionKey());
			this.trimActionKeys();
			if (!didAct) this.log('auto action skipped');
		} catch (err) {
			this.log('auto action failed', err, 'error');
		} finally {
			if (this.pendingActionKey === key) this.pendingActionKey = null;
		}
	}

	private async takeRandomAction(): Promise<boolean> {
		const game = this.game;
		if (!game || game.info.status !== 'active' || !game.actor.alive) return false;

		const currentKey = this.currentActionKey();
		if (this.completedActionKeys.has(currentKey)) return false;

		if (game.info.phase === 'poll') return this.submitRandomVote(game);
		if (game.info.phase === 'trial') return this.submitRandomVerdict(game);
		if (game.info.phase === 'evening') return this.submitRandomTargets(game);

		return false;
	}

	private async submitRandomVote(game: GameSyncResponse): Promise<boolean> {
		const choices = game.state.actors.filter(
			(actor): actor is ActorState & { number: number } =>
				actor.alive && actor.number !== undefined && actor.number !== game.actor.number,
		);
		const target = randomChoice(choices);
		if (!target) return false;

		await this.client.submitGameVote({
			gameId: game.info.id,
			targetActorNumber: target.number,
		});
		this.log(`auto voted #${target.number} ${target.alias}`);
		await this.refresh();
		return true;
	}

	private async submitRandomVerdict(game: GameSyncResponse): Promise<boolean> {
		const verdict: Verdict = randomChoice(['guilty', 'innocent'] as const) ?? 'innocent';
		await this.client.submitGameVerdict({ gameId: game.info.id, verdict });
		this.log(`auto verdict ${verdict}`);
		await this.refresh();
		return true;
	}

	private async submitRandomTargets(game: GameSyncResponse): Promise<boolean> {
		const targetActorNumbers: number[] = [];

		for (let slot = 0; slot < game.actor.possibleTargets.length; slot += 1) {
			if (slot > 0 && targetActorNumbers[slot - 1] === undefined) break;
			const target = randomChoice(game.actor.possibleTargets[slot] ?? []);
			if (target === undefined) break;
			targetActorNumbers[slot] = target;
		}

		if (targetActorNumbers.length === 0) return false;

		await this.client.setGameTargets({ gameId: game.info.id, targetActorNumbers });
		this.log(`auto targets ${targetActorNumbers.join(', ')}`);
		await this.refresh();
		return true;
	}

	private currentActionKey(): string {
		if (!this.game) return 'none';
		return `${this.game.info.id}:${this.game.info.phase}:${this.game.info.syncTs}`;
	}

	private trimActionKeys(): void {
		while (this.completedActionKeys.size > 50) {
			const first = this.completedActionKeys.values().next().value;
			if (!first) return;
			this.completedActionKeys.delete(first);
		}
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

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: readonly T[]): T | undefined {
	if (items.length === 0) return undefined;
	return items[randomInt(0, items.length - 1)];
}
