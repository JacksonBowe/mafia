import {
	BoxRenderable,
	RGBA,
	ScrollBoxRenderable,
	TextRenderable,
	createCliRenderer,
} from '@opentui/core';
import { topicPrefix } from '@mafia/core/realtime';
import { createClient, MAX_PLAYERS, type LobbyInfo } from '@mafia/sdk';
import { parseArgs } from 'node:util';
import { Resource } from 'sst';
import { loadBotKeys } from './config';
import { BotManager } from './manager';
import type { BotLogEntry, BotSnapshot } from './types';

const MAX_LOG_LINES = 12;
const MAX_LOBBY_ROWS = 12;
const MAX_BOT_ROWS = 15;

type ActivePane = 'lobbies' | 'bots';

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: {
			'lobby-id': { type: 'string' },
			count: { type: 'string' },
			keys: { type: 'string' },
		},
	});

	let keys = await loadBotKeys();
	if (values.keys) {
		const wanted = values.keys.split(',').map((s) => s.trim());
		keys = keys.filter((k) => wanted.includes(k.label));
	}
	if (values.count) {
		const count = Number.parseInt(values.count, 10);
		if (Number.isNaN(count) || count < 1) throw new Error(`Invalid --count: ${values.count}`);
		keys = keys.slice(0, count);
	}
	if (keys.length === 0) throw new Error('No bot keys selected');

	let redrawQueued = false;
	let activePane: ActivePane = 'lobbies';
	let selectedLobbyIndex = 0;
	let lobbyOffset = 0;
	let selectedBotIndex = 0;
	let botOffset = 0;
	let statusLine = 'ready';
	let lobbies: LobbyInfo[] = [];
	let shuttingDown = false;

	const apiUrl = Resource.Api.url;
	const client = createClient({ baseUrl: apiUrl, getApiKey: () => keys[0]?.key });
	const manager = new BotManager({
		keys,
		apiUrl,
		realtime: {
			endpoint: Resource.Realtime.endpoint,
			authorizer: Resource.Realtime.authorizer,
			prefix: topicPrefix(),
		},
		onChange: () => queueRedraw(),
	});

	const renderer = await createCliRenderer({ exitOnCtrlC: false });
	const lobbyRows = Array.from({ length: MAX_LOBBY_ROWS }, (_, index) => {
		const row = new TextRenderable(renderer, {
			content: '',
			fg: '#cbd5e1',
			width: '100%',
			height: 1,
			onMouseDown: () => {
				const next = lobbyOffset + index;
				if (next >= lobbies.length) return;
				activePane = 'lobbies';
				selectedLobbyIndex = next;
				redraw();
			},
		});
		return row;
	});
	const botRows = Array.from({ length: MAX_BOT_ROWS }, (_, index) => {
		const row = new TextRenderable(renderer, {
			content: '',
			fg: '#cbd5e1',
			width: '100%',
			height: 1,
			onMouseDown: () => {
				const snapshots = manager.snapshots();
				const next = botOffset + index;
				if (next >= snapshots.length) return;
				activePane = 'bots';
				selectedBotIndex = next;
				manager.select(selectedBotIndex);
				redraw();
			},
		});
		return row;
	});
	const lobbyDetail = new TextRenderable(renderer, { content: '', fg: '#d7d7ff' });
	const botDetail = new TextRenderable(renderer, { content: '', fg: '#d7d7ff' });
	const legend = new TextRenderable(renderer, { content: 'loading shortcuts...', fg: '#a8a8a8' });
	const logs = new ScrollBoxRenderable(renderer, {
		width: '100%',
		height: MAX_LOG_LINES + 2,
		stickyScroll: true,
		stickyStart: 'bottom',
	});
	const logText = new TextRenderable(renderer, { content: '', fg: '#cbd5e1' });
	const footer = new TextRenderable(renderer, { content: 'loading...', fg: '#a8a8a8' });

	const root = new BoxRenderable(renderer, {
		width: '100%',
		height: '100%',
		flexDirection: 'column',
		padding: 1,
		gap: 1,
		backgroundColor: '#0f1117',
	});
	root.add(new TextRenderable(renderer, { content: 'Mafia Bot Control Panel', fg: '#7dd3fc' }));

	const main = new BoxRenderable(renderer, {
		width: '100%',
		flexGrow: 1,
		gap: 1,
		flexDirection: 'row',
	});
	root.add(main);

	const lobbyPanel = new BoxRenderable(renderer, {
		width: 42,
		borderStyle: 'rounded',
		borderColor: '#334155',
		padding: 1,
		flexDirection: 'column',
	});
	main.add(lobbyPanel);
	lobbyPanel.add(new TextRenderable(renderer, { content: 'Lobbies', fg: '#facc15' }));
	for (const row of lobbyRows) lobbyPanel.add(row);

	const botPanel = new BoxRenderable(renderer, {
		width: 34,
		borderStyle: 'rounded',
		borderColor: '#334155',
		padding: 1,
		flexDirection: 'column',
	});
	main.add(botPanel);
	botPanel.add(new TextRenderable(renderer, { content: 'Bots', fg: '#facc15' }));
	for (const row of botRows) botPanel.add(row);

	const detailPanel = new BoxRenderable(renderer, {
		flexGrow: 1,
		borderStyle: 'rounded',
		borderColor: '#334155',
		padding: 1,
		flexDirection: 'column',
		gap: 1,
	});
	main.add(detailPanel);
	detailPanel.add(new TextRenderable(renderer, { content: 'Selected Lobby', fg: '#facc15' }));
	detailPanel.add(lobbyDetail);
	detailPanel.add(new TextRenderable(renderer, { content: 'Selected Bot', fg: '#facc15' }));
	detailPanel.add(botDetail);
	detailPanel.add(new TextRenderable(renderer, { content: 'Logs', fg: '#facc15' }));
	detailPanel.add(logs);

	const legendPanel = new BoxRenderable(renderer, {
		width: '100%',
		borderStyle: 'single',
		borderColor: '#334155',
		padding: 1,
	});
	legendPanel.add(legend);
	root.add(legendPanel);
	root.add(footer);
	logs.add(logText);
	renderer.root.add(root);

	renderer.keyInput.on('keypress', (key) => {
		if (key.ctrl && key.name === 'c') {
			shutdown();
			return;
		}

		void handleKey(key.name, key.sequence, key.shift);
	});

	redraw();
	await refreshAllData();
	redraw();

	async function handleKey(name: string, sequence: string, shift: boolean): Promise<void> {
		const keyName = name.toLowerCase();
		const keySequence = sequence.toLowerCase();
		const shifted = shift || name !== keyName;
		try {
			if (keyName === 'q') return shutdown();
			if (keyName === 'tab') {
				activePane = activePane === 'lobbies' ? 'bots' : 'lobbies';
				return redraw();
			}
			if (keyName === 'up' || keyName === 'k') return moveSelection(-1);
			if (keyName === 'down' || keyName === 'j') return moveSelection(1);
			if (keyName === 'r' || keySequence === 'r') await refreshAllData();
			if (keyName === 'f') await fillSelectedLobby();
			if (keyName === 'c')
				await runAction(shifted ? 'connect all' : 'connect selected', () =>
					shifted ? manager.connectAll() : manager.connectSelected(),
				);
			if (keyName === 'd') {
				if (shifted) manager.disconnectAll();
				else manager.disconnectSelected();
				statusLine = shifted ? 'disconnected all' : 'disconnected selected';
				redraw();
			}
			if (keyName === 'l')
				await runAction('leave selected bot', () => manager.leaveSelected());
			if (keyName === 's')
				await runAction('start selected lobby', () => {
					const lobby = selectedLobby();
					if (!lobby) throw new Error('No lobby selected');
					return manager.startLobbyFromSelected(lobby.id);
				});
		} catch (err) {
			if (shuttingDown) return;
			statusLine = err instanceof Error ? err.message : String(err);
			redraw();
		}
	}

	function moveSelection(delta: number): void {
		if (activePane === 'lobbies') {
			selectedLobbyIndex = clamp(
				selectedLobbyIndex + delta,
				0,
				Math.max(0, lobbies.length - 1),
			);
			lobbyOffset = keepVisible(selectedLobbyIndex, lobbyOffset, MAX_LOBBY_ROWS);
		} else {
			const snapshots = manager.snapshots();
			selectedBotIndex = clamp(
				selectedBotIndex + delta,
				0,
				Math.max(0, snapshots.length - 1),
			);
			botOffset = keepVisible(selectedBotIndex, botOffset, MAX_BOT_ROWS);
			manager.select(selectedBotIndex);
		}
		redraw();
	}

	async function refreshLobbies(): Promise<boolean> {
		statusLine = 'refreshing lobbies...';
		redraw();
		try {
			lobbies = await client.listLobbies();
		} catch (err) {
			statusLine =
				err instanceof Error
					? `refresh failed: ${err.message}`
					: `refresh failed: ${String(err)}`;
			redraw();
			return false;
		}
		if (values['lobby-id']) {
			const preselected = lobbies.findIndex((lobby) => lobby.id === values['lobby-id']);
			if (preselected >= 0) selectedLobbyIndex = preselected;
		}
		selectedLobbyIndex = clamp(selectedLobbyIndex, 0, Math.max(0, lobbies.length - 1));
		lobbyOffset = keepVisible(selectedLobbyIndex, lobbyOffset, MAX_LOBBY_ROWS);
		statusLine = `loaded ${lobbies.length} lobby(s) at ${new Date().toLocaleTimeString()}`;
		return true;
	}

	async function refreshAllData(): Promise<void> {
		if (shuttingDown) return;
		statusLine = 'refreshing all data...';
		redraw();
		const [lobbyOk] = await Promise.all([refreshLobbies(), manager.refreshAll()]);
		if (shuttingDown) return;
		if (lobbyOk) statusLine = `refreshed all data at ${new Date().toLocaleTimeString()}`;
		redraw();
	}

	async function fillSelectedLobby(): Promise<void> {
		const lobby = selectedLobby();
		if (!lobby) throw new Error('No lobby selected');
		await runAction(`fill ${lobby.name}`, async () => {
			const result = await manager.fillLobby(lobby);
			await refreshLobbies();
			statusLine = `fill done: joined ${result.joined}/${result.availableSlots} slot(s)`;
		});
	}

	async function runAction(label: string, action: () => Promise<void>): Promise<void> {
		statusLine = `${label}...`;
		redraw();
		await action();
		if (statusLine.endsWith('...')) statusLine = `${label} done`;
		redraw();
	}

	function queueRedraw(): void {
		if (shuttingDown) return;
		if (redrawQueued) return;
		redrawQueued = true;
		queueMicrotask(() => {
			redrawQueued = false;
			if (shuttingDown) return;
			redraw();
		});
	}

	function redraw(): void {
		if (shuttingDown) return;
		const snapshots = manager.snapshots();
		selectedBotIndex = clamp(selectedBotIndex, 0, Math.max(0, snapshots.length - 1));
		manager.select(selectedBotIndex);

		for (let i = 0; i < lobbyRows.length; i += 1) {
			const row = lobbyRows[i];
			const lobby = lobbies[lobbyOffset + i];
			const emptyText =
				i === 0 && lobbies.length === 0 ? 'No lobbies. Press r to refresh.' : '';
			row.content = lobby ? lobbyRow(lobby, lobbyOffset + i) : emptyText;
			row.bg = rowColor(activePane, 'lobbies', lobbyOffset + i, selectedLobbyIndex, !!lobby);
		}

		for (let i = 0; i < botRows.length; i += 1) {
			const row = botRows[i];
			const bot = snapshots[botOffset + i];
			const emptyText = i === 0 && snapshots.length === 0 ? 'No bots loaded.' : '';
			row.content = bot ? botRow(bot, botOffset + i) : emptyText;
			row.bg = rowColor(activePane, 'bots', botOffset + i, selectedBotIndex, !!bot);
		}

		const lobby = selectedLobby();
		lobbyDetail.content = lobby ? lobbyDetailText(lobby) : 'No lobby selected';
		botDetail.content = snapshots[selectedBotIndex]
			? botDetailText(snapshots[selectedBotIndex])
			: 'No bot selected';
		legend.content =
			'tab switch list | up/down or k/j move | click row select | r/R refresh all API data | f fill lobby | c/C connect one/all | d/D disconnect one/all | l leave bot | s start lobby | q quit';
		footer.content = `${activePane} active | bots ${snapshots.length} | lobbies ${lobbies.length} | ${statusLine}`;
		logText.content = logLines(manager.logsForSelected()).join('\n');
	}

	function selectedLobby(): LobbyInfo | null {
		return lobbies[selectedLobbyIndex] ?? null;
	}

	function shutdown(): void {
		if (shuttingDown) return;
		shuttingDown = true;
		redrawQueued = false;
		manager.disconnectAll();
		renderer.destroy();
		process.exit(0);
	}
}

function lobbyRow(lobby: LobbyInfo, index: number): string {
	return `${String(index + 1).padStart(2, ' ')} ${lobby.name} ${lobby.members.length}/${MAX_PLAYERS}`;
}

function botRow(bot: BotSnapshot, index: number): string {
	return `${String(index + 1).padStart(2, ' ')} ${statusIcon(bot.status)} ${bot.label} ${bot.status}`;
}

function lobbyDetailText(lobby: LobbyInfo): string {
	return [
		`name: ${lobby.name}`,
		`id: ${lobby.id}`,
		`host: ${lobby.host.name} (${lobby.host.id})`,
		`members: ${lobby.members.length}/${MAX_PLAYERS}`,
		`member names: ${lobby.members.map((member) => member.name).join(', ') || '-'}`,
	].join('\n');
}

function botDetailText(bot: BotSnapshot): string {
	const actor = bot.game?.actor;
	return [
		`label: ${bot.label}`,
		`status: ${bot.status}`,
		`user: ${bot.user ? `${bot.user.name} (${bot.user.id})` : '-'}`,
		`lobby: ${bot.lobby ? `${bot.lobby.name} (${bot.lobby.members.length} members)` : '-'}`,
		`game: ${bot.game ? `${bot.game.info.id} ${bot.game.info.phase}/${bot.game.info.status}` : '-'}`,
		`role: ${actor?.role ?? '-'}`,
		`alignment: ${actor?.alignment ?? '-'}`,
		`actor: ${actor ? `#${actor.number} ${actor.name} (${actor.id})` : '-'}`,
		`error: ${bot.lastError ?? '-'}`,
	].join('\n');
}

function logLines(entries: BotLogEntry[]): string[] {
	return entries.slice(-MAX_LOG_LINES).map((entry) => {
		const time = entry.at.toLocaleTimeString();
		const extra = entry.extra === undefined ? '' : ` ${formatExtra(entry.extra)}`;
		return `${time} ${entry.level.toUpperCase()} ${entry.message}${extra}`;
	});
}

function formatExtra(extra: unknown): string {
	if (extra instanceof Error) return extra.message;
	if (typeof extra === 'string') return extra;
	try {
		return JSON.stringify(extra);
	} catch {
		return String(extra);
	}
}

function statusIcon(status: BotSnapshot['status']): string {
	switch (status) {
		case 'error':
			return 'x';
		case 'in_game':
			return 'g';
		case 'in_lobby':
			return 'l';
		case 'connected':
			return 'c';
		case 'authenticating':
		case 'joining_lobby':
			return '*';
		case 'disconnected':
			return '-';
		case 'idle':
			return '.';
	}
}

function rowColor(
	activePane: ActivePane,
	pane: ActivePane,
	index: number,
	selectedIndex: number,
	hasItem: boolean,
): RGBA {
	if (!hasItem) return RGBA.fromHex('#0f1117');
	if (index !== selectedIndex) return RGBA.fromHex('#0f1117');
	return RGBA.fromHex(activePane === pane ? '#1e3a8a' : '#263244');
}

function keepVisible(index: number, offset: number, rows: number): number {
	if (index < offset) return index;
	if (index >= offset + rows) return index - rows + 1;
	return offset;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(value, max));
}

main().catch((err: unknown) => {
	console.error('Fatal:', err);
	process.exit(1);
});
