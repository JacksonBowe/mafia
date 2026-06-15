import { BotSession } from './session';
import type { BotKey } from './config';
import type { LobbyInfo } from '@mafia/sdk';
import type { BotLogEntry, BotSessionConfig, BotSnapshot, RealtimeConfig } from './types';

export type BotManagerConfig = {
	keys: BotKey[];
	apiUrl: string;
	realtime: RealtimeConfig;
	onChange?: () => void;
};

export class BotManager {
	private readonly sessions: BotSession[];
	private readonly logs: BotLogEntry[] = [];
	private selectedIndex = 0;

	constructor(cfg: BotManagerConfig) {
		const base: Pick<BotSessionConfig, 'apiUrl' | 'realtime'> = {
			apiUrl: cfg.apiUrl,
			realtime: cfg.realtime,
		};

		this.sessions = cfg.keys.map(
			(k) =>
				new BotSession({
					...base,
					label: k.label,
					apiKey: k.key,
					onChange: cfg.onChange,
					onLog: (entry) => {
						this.logs.push(entry);
						this.logs.splice(0, Math.max(0, this.logs.length - 500));
						cfg.onChange?.();
					},
				}),
		);
	}

	snapshots(): BotSnapshot[] {
		return this.sessions.map((session) => session.snapshot());
	}

	logsForSelected(): BotLogEntry[] {
		return this.selected()?.snapshot().logs ?? [];
	}

	allLogs(): BotLogEntry[] {
		return [...this.logs];
	}

	selectedSnapshot(): BotSnapshot | null {
		return this.selected()?.snapshot() ?? null;
	}

	select(index: number): void {
		if (this.sessions.length === 0) return;
		this.selectedIndex = Math.max(0, Math.min(index, this.sessions.length - 1));
	}

	async connectSelected(): Promise<void> {
		await this.selected()?.connect();
	}

	async connectAll(): Promise<void> {
		await Promise.allSettled(this.sessions.map((session) => session.connect()));
	}

	async joinSelected(): Promise<void> {
		await this.selected()?.joinLobby();
	}

	async joinSelectedToLobby(lobbyId: string): Promise<void> {
		await this.selected()?.joinLobby(lobbyId);
	}

	async joinAll(lobbyId: string): Promise<void> {
		await Promise.allSettled(this.sessions.map((session) => session.joinLobby(lobbyId)));
	}

	async fillLobby(lobby: LobbyInfo): Promise<{ joined: number; availableSlots: number }> {
		const memberIds = new Set(lobby.members.map((member) => member.id));
		let joined = 0;
		const availableSlots = Math.max(0, 15 - lobby.members.length);

		for (const session of this.sessions) {
			if (joined >= availableSlots) break;
			const userId = await session.getUserId();
			if (memberIds.has(userId)) continue;
			await session.joinLobby(lobby.id);
			memberIds.add(userId);
			joined += 1;
		}

		return { joined, availableSlots };
	}

	async leaveSelected(): Promise<void> {
		await this.selected()?.leaveLobby();
	}

	async refreshSelected(): Promise<void> {
		await this.selected()?.refresh();
	}

	async refreshAll(): Promise<void> {
		await Promise.allSettled(this.sessions.map((session) => session.refresh()));
	}

	async startLobbyFromSelected(lobbyId?: string): Promise<void> {
		await this.selected()?.startLobby(lobbyId);
	}

	disconnectSelected(): void {
		this.selected()?.disconnect();
	}

	disconnectAll(): void {
		for (const session of this.sessions) session.disconnect();
	}

	private selected(): BotSession | null {
		return this.sessions[this.selectedIndex] ?? null;
	}
}
