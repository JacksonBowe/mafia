import { lynchGame, loadGame, resolveGame, type ActorState, type GameEventGroupDump, type GameState, type StateGraveyardRecord, type WinnerSummary } from '@mafia/engine';
import { and, eq, sql } from 'drizzle-orm';
import { Resource } from 'sst';
import { ulid } from 'ulid';
import { z } from 'zod';
import { afterTx, createTransaction } from '../../db/transaction';
import { InputError, isULID } from '../../error';
import { GameErrors } from '../schema';
import { realtime } from '../../realtime';
import { fn } from '../../util/fn';
import { gamePhaseTransitionTable, gamePlayerTable, gameTable } from '../game.sql';
import type { GameStatus } from '../schema';
import { Realtime } from './events';
import { appendEngineLog, appendGameLog, type EngineLogInput, type GameLogInput } from './log';
import {
	GameSessionErrors as SessionErrors,
	GamePhaseSchema,
	GameSessionInfoSchema,
	type GamePhase,
	type GamePlayer,
	type GameSessionInfo,
} from './schema';
import { buildEngineActors } from './state';

type AdvancePhaseResult = {
	waitSeconds: number;
	nextPhase: GamePhase;
	continue: boolean;
	status?: GameStatus;
	pollCount?: number;
	engineState?: GameState;
	actors?: ActorState[];
	events?: GameEventGroupDump | null;
	deaths?: StateGraveyardRecord[];
	winners?: WinnerSummary[];
	lynchResult?: {
		actorId: string;
		guiltyCount: number;
		abstainCount: number;
		innocentCount: number;
		isGuilty: boolean;
	};
	trialActorNumber?: number;
	trialOver?: boolean;
	engineLogs?: Array<Omit<EngineLogInput, 'gameId'>>;
};

const AdvancePhaseResponseSchema = z.object({
	gameId: isULID(),
	continue: z.boolean(),
	waitSeconds: z.number().int().nonnegative(),
	phase: GamePhaseSchema,
	pollCount: z.number().int().nonnegative(),
	phaseVersion: z.number().int().nonnegative(),
});

const PHASE_INFO: Record<GamePhase, { duration: number }> = {
	pregame: { duration: 15 },
	day: { duration: 15 }, // 120 really, but test with shorter time for my sanity
	evening: { duration: 15 }, // 60 really, but test with shorter time for my sanity
	night: { duration: 0 },
	morning: { duration: 0 },
	poll: { duration: 20 },
	defense: { duration: 20 },
	trial: { duration: 20 },
	lynch: { duration: 10 },
};

const MAX_POLLS = 3;
const BASE_MORNING_DURATION = 5;
const TIME_PER_DEATH = 5;

const enterPhase = (
	nextPhase: GamePhase,
	overrides: Partial<AdvancePhaseResult> = {},
): AdvancePhaseResult => ({
	nextPhase,
	waitSeconds: PHASE_INFO[nextPhase].duration,
	continue: true,
	...overrides,
});

const getAliveActorIds = (actors: ActorState[]) =>
	actors.filter((actor) => actor.alive).map((actor) => actor.id);

const getNightDeaths = (game: GameSessionInfo) =>
	game.engineState.graveyard.filter((death) => death.dod === game.engineState.day);

const tallyVotesForPlayers = (players: GamePlayer[], aliveActorIds: string[]) => {
	const aliveActorIdSet = new Set(aliveActorIds);
	const votes: Record<string, number> = {};

	for (const player of players) {
		if (
			!aliveActorIdSet.has(player.actorId) ||
			player.voteTargetActorId === null ||
			!aliveActorIdSet.has(player.voteTargetActorId)
		)
			continue;
		votes[player.voteTargetActorId] = (votes[player.voteTargetActorId] ?? 0) + 1;
	}

	let maxVotes = 0;
	let winner: string | null = null;
	for (const [actorId, count] of Object.entries(votes)) {
		if (count <= maxVotes) continue;
		maxVotes = count;
		winner = actorId;
	}

	return {
		votes,
		winner: maxVotes > Math.floor(aliveActorIds.length / 2) ? winner : null,
	};
};

const tallyVerdictsForPlayers = (players: GamePlayer[], aliveActorIds: string[]) => {
	const aliveActorIdSet = new Set(aliveActorIds);
	let guiltyCount = 0;
	let abstainCount = 0;
	let innocentCount = 0;

	for (const player of players) {
		if (player.onTrial || !aliveActorIdSet.has(player.actorId)) continue;
		if (player.verdict === 'guilty') guiltyCount++;
		else if (player.verdict === 'innocent') innocentCount++;
		else abstainCount++;
	}

	return { guiltyCount, abstainCount, innocentCount, isGuilty: guiltyCount > innocentCount };
};

const nextPollOrEvening = (pollCount: number, overrides: Partial<AdvancePhaseResult> = {}) => {
	if (pollCount < MAX_POLLS) return enterPhase('poll', { pollCount, ...overrides });
	return enterPhase('evening', { pollCount: 0, ...overrides });
};

const titleCasePhase = (phase: GamePhase) => phase.charAt(0).toUpperCase() + phase.slice(1);

const getPhaseLabel = (phase: GamePhase, pollCount: number) => {
	if (phase === 'poll') return `Poll ${pollCount + 1}`;
	return titleCasePhase(phase);
};

const getPhaseSequence = (phase: GamePhase, pollCount: number) => {
	if (phase === 'poll') return pollCount;
	return 0;
};

const processEvening = (game: GameSessionInfo): AdvancePhaseResult => {
	const resolved = resolveGame({
		state: game.engineState,
		config: game.engineConfig,
		actors: buildEngineActors(game.actors, game.players),
	});

	// TODO: Fan out resolved.events to Realtime.Event once event target/topic mapping is finalized.
	return enterPhase('night', {
		waitSeconds: resolved.events.duration,
		engineState: resolved.state,
		actors: resolved.actors,
		events: resolved.events,
		engineLogs: [
			{
				operation: 'resolve',
				phase: 'evening',
				data: {
					day: resolved.state.day,
					eventDuration: resolved.events.duration,
					winners: resolved.winners,
				},
				lines: resolved.log,
			},
		],
	});
};

const processNight = (game: GameSessionInfo): AdvancePhaseResult => {
	const engineResult = loadGame({
		state: game.engineState,
		config: game.engineConfig,
		actors: buildEngineActors(game.actors, game.players),
	});
	const deaths = getNightDeaths(game);
	const waitSeconds = BASE_MORNING_DURATION + deaths.length * TIME_PER_DEATH;

	if (engineResult.winners && engineResult.winners.length > 0) {
		return enterPhase('morning', {
			waitSeconds,
			continue: false,
			status: 'completed',
			deaths,
			winners: engineResult.winners,
			engineLogs: [
				{
					operation: 'load-win-check',
					phase: 'night',
					data: { day: game.engineState.day, winners: engineResult.winners },
					lines: engineResult.log,
				},
			],
		});
	}

	return enterPhase('morning', {
		waitSeconds,
		deaths,
		engineLogs: [
			{
				operation: 'load-win-check',
				phase: 'night',
				data: { day: game.engineState.day, winners: null },
				lines: engineResult.log,
			},
		],
	});
};

const serializeLifecycleError = (error: unknown, depth = 0): Record<string, unknown> => {
	if (!(error instanceof Error)) {
		return { name: 'NonError', message: String(error), stack: null, cause: null };
	}

	return {
		name: error.name,
		message: error.message,
		stack: error.stack ?? null,
		cause:
			error.cause instanceof Error && depth < 3
				? serializeLifecycleError(error.cause, depth + 1)
				: null,
	};
};

const recordAdvancePhaseError = async (gameId: string, error: unknown) => {
	// TODO: Record lifecycle failures from game creation, termination, and loop startup too.
	if (error instanceof InputError && error.code === GameErrors.GameNotFound) return;

	try {
		await createTransaction(async (tx) => {
			const [game] = await tx
				.select({ phase: gameTable.phase })
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.limit(1);
			if (!game) return;

			await appendGameLog(tx, {
				gameId,
				type: 'game.error',
				phase: GamePhaseSchema.parse(game.phase),
				data: {
					operation: 'advance-phase',
					...serializeLifecycleError(error),
				},
			});
		});
	} catch (logError) {
		console.error('Failed to record game lifecycle error', { gameId, error: logError });
	}
};

export const advancePhase = fn(
	z.object({
		gameId: isULID(),
		expectedPhaseVersion: z.number().int().nonnegative(),
		idempotencyKey: z.string().min(1),
	}),
	async ({ gameId, expectedPhaseVersion, idempotencyKey }) =>
		createTransaction(async (tx) => {
			const [gameRow] = await tx
				.select()
				.from(gameTable)
				.where(eq(gameTable.id, gameId))
				.for('update');

			if (!gameRow) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			const [previous] = await tx
				.select({ result: gamePhaseTransitionTable.result })
				.from(gamePhaseTransitionTable)
				.where(
					and(
						eq(gamePhaseTransitionTable.gameId, gameId),
						eq(gamePhaseTransitionTable.idempotencyKey, idempotencyKey),
					),
				)
				.limit(1);
			if (previous) {
				return AdvancePhaseResponseSchema.parse(previous.result);
			}

			if (gameRow.phaseVersion !== expectedPhaseVersion) {
				throw new InputError(SessionErrors.GameInvalidState, 'Stale phase transition command');
			}

			const persistResult = async (result: z.output<typeof AdvancePhaseResponseSchema>) => {
				await tx.insert(gamePhaseTransitionTable).values({
					id: ulid(),
					gameId,
					idempotencyKey,
					expectedPhaseVersion,
					result,
				});
				return result;
			};

			const players = await tx
				.select()
				.from(gamePlayerTable)
				.where(eq(gamePlayerTable.gameId, gameId));
			const game = GameSessionInfoSchema.parse({ ...gameRow, players });

			if (game.status !== 'active') {
				return persistResult({
					gameId,
					continue: false,
					waitSeconds: 0,
					phase: game.phase,
					pollCount: game.pollCount,
					phaseVersion: game.phaseVersion,
				});
			}

			const clearVotes = () =>
				tx
					.update(gamePlayerTable)
					.set({ voteTargetActorId: null })
					.where(eq(gamePlayerTable.gameId, gameId));
			const clearVerdicts = () =>
				tx
					.update(gamePlayerTable)
					.set({ verdict: null })
					.where(eq(gamePlayerTable.gameId, gameId));
			const clearOnTrial = () =>
				tx
					.update(gamePlayerTable)
					.set({ onTrial: false })
					.where(eq(gamePlayerTable.gameId, gameId));

			const aliveActorIds = getAliveActorIds(game.actors);
			let result: AdvancePhaseResult;
			const auditEntries: Array<Omit<GameLogInput, 'gameId'>> = [];

			switch (game.phase) {
				case 'pregame':
					result = enterPhase('evening');
					break;

				case 'day':
					await clearVotes();
					await clearVerdicts();
					await clearOnTrial();
					result = enterPhase('poll', { pollCount: 0 });
					break;

				case 'poll': {
					const nextPollCount = game.pollCount + 1;
					const voteTally = tallyVotesForPlayers(game.players, aliveActorIds);
					await clearVotes();
					auditEntries.push({
						type: 'game.poll.tallied',
						phase: 'poll',
						data: { ...voteTally, pollCount: nextPollCount },
					});

					if (voteTally.winner) {
						const [trialPlayer] = await tx
							.update(gamePlayerTable)
							.set({ onTrial: true })
							.where(
								and(
									eq(gamePlayerTable.gameId, gameId),
									eq(gamePlayerTable.actorId, voteTally.winner),
								),
							)
							.returning({ number: gamePlayerTable.number });

						if (!trialPlayer) {
							throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
						}

						result = enterPhase('defense', {
							pollCount: nextPollCount,
							trialActorNumber: trialPlayer.number,
						});
						break;
					}

					result = nextPollOrEvening(nextPollCount);
					break;
				}

				case 'defense':
					result = enterPhase('trial');
					break;

				case 'trial': {
					const trialPlayer = game.players.find((player) => player.onTrial);
					if (!trialPlayer) {
						throw new InputError(SessionErrors.GameInvalidState, 'No player on trial');
					}

					const verdictTally = tallyVerdictsForPlayers(game.players, aliveActorIds);
					const lynchResult = { actorId: trialPlayer.actorId, ...verdictTally };
					auditEntries.push({
						type: 'game.verdict.tallied',
						phase: 'trial',
						actorId: trialPlayer.actorId,
						data: lynchResult,
					});

					if (verdictTally.isGuilty) {
						result = enterPhase('lynch', { lynchResult });
						break;
					}

					await clearVerdicts();
					await clearOnTrial();
					result = nextPollOrEvening(game.pollCount, { lynchResult, trialOver: true });
					break;
				}

				case 'lynch': {
					const trialPlayer = game.players.find((player) => player.onTrial);
					if (!trialPlayer) {
						throw new InputError(SessionErrors.GameInvalidState, 'No player on trial');
					}
					const verdictTally = tallyVerdictsForPlayers(game.players, aliveActorIds);

					const lynched = lynchGame({
						state: game.engineState,
						config: game.engineConfig,
						actors: buildEngineActors(game.actors, game.players),
						actorNumber: trialPlayer.number,
					});
					await clearOnTrial();
					await clearVerdicts();
					result = nextPollOrEvening(game.pollCount, {
						engineState: lynched.state,
						actors: lynched.actors,
						trialOver: true,
						engineLogs: [
							{
								operation: 'lynch',
								phase: 'lynch',
								data: {
									actorNumber: trialPlayer.number,
									actorId: trialPlayer.actorId,
									...verdictTally,
									outcome: 'lynched',
								},
								lines: lynched.log,
							},
						],
					});
					break;
				}

				case 'evening':
					result = processEvening(game);
					break;

				case 'night':
					result = processNight(game);
					await tx
						.update(gamePlayerTable)
						.set({ targetActorIds: [] })
						.where(eq(gamePlayerTable.gameId, gameId));
					break;

				case 'morning':
					result = enterPhase('day');
					break;

				default:
					throw new InputError(SessionErrors.GameInvalidState, 'Invalid game phase');
			}

			const updates: Record<string, unknown> = {
				phase: result.nextPhase,
				phaseVersion: sql`${gameTable.phaseVersion} + 1`,
			};
			if (result.status) updates.status = result.status;
			if (result.pollCount !== undefined) updates.pollCount = result.pollCount;
			if (result.engineState) updates.engineState = result.engineState;
			if (result.actors) updates.actors = result.actors;
			if (result.events !== undefined) updates.events = result.events;

			const [updated] = await tx
				.update(gameTable)
				.set(updates)
				.where(eq(gameTable.id, gameId))
				.returning({ id: gameTable.id, phaseVersion: gameTable.phaseVersion });

			if (!updated) {
				throw new InputError(GameErrors.GameNotFound, 'Game not found');
			}

			await appendGameLog(tx, {
				gameId,
				type: 'game.phase.entered',
				phase: result.nextPhase,
				data: {
					fromPhase: game.phase,
					waitSeconds: result.waitSeconds,
					pollCount: result.pollCount ?? game.pollCount,
				},
			});
			for (const entry of auditEntries) {
				await appendGameLog(tx, { gameId, ...entry });
			}
			if (result.trialActorNumber !== undefined) {
				await appendGameLog(tx, {
					gameId,
					type: 'game.trial.started',
					phase: result.nextPhase,
					data: { actorNumber: result.trialActorNumber },
				});
			}
			if (result.trialOver) {
				await appendGameLog(tx, {
					gameId,
					type: 'game.trial.ended',
					phase: game.phase,
					data: { nextPhase: result.nextPhase },
				});
			}
			if (result.deaths && result.deaths.length > 0) {
				await appendGameLog(tx, {
					gameId,
					type: 'game.deaths.announced',
					phase: result.nextPhase,
					data: { deaths: result.deaths },
				});
			}
			if (result.winners && result.winners.length > 0) {
				await appendGameLog(tx, {
					gameId,
					type: 'game.over',
					phase: result.nextPhase,
					data: { winners: result.winners },
				});
			}
			for (const engineLog of result.engineLogs ?? []) {
				const engineLogId = await appendEngineLog(tx, { gameId, ...engineLog });
				const type =
					engineLog.operation === 'resolve'
						? 'game.engine.resolved'
						: engineLog.operation === 'lynch'
							? 'game.lynch.resolved'
							: 'game.engine.win_checked';
				await appendGameLog(tx, {
					gameId,
					type,
					phase: engineLog.phase,
					data: { engineLogId, operation: engineLog.operation, ...engineLog.data },
				});
			}

			await afterTx(async () => {
				const nextPollCount = result.pollCount ?? game.pollCount;

				await realtime.publish(Resource.Realtime, Realtime.PhaseChange, {
					gameId,
					phase: result.nextPhase,
					duration: result.waitSeconds,
					label: getPhaseLabel(result.nextPhase, nextPollCount),
					sequence: getPhaseSequence(result.nextPhase, nextPollCount),
				});

				if (result.trialActorNumber !== undefined) {
					await realtime.publish(Resource.Realtime, Realtime.Trial, {
						gameId,
						actorNumber: result.trialActorNumber,
					});
				}

				if (result.trialOver) {
					await realtime.publish(Resource.Realtime, Realtime.TrialOver, { gameId });
				}

				if (result.lynchResult) {
					await realtime.publish(Resource.Realtime, Realtime.LynchResult, {
						gameId,
						...result.lynchResult,
					});
				}

				if (result.engineState) {
					await realtime.publish(Resource.Realtime, Realtime.State, {
						gameId,
						state: result.engineState,
					});
				}

				if (result.deaths && result.deaths.length > 0) {
					await realtime.publish(Resource.Realtime, Realtime.Deaths, {
						gameId,
						deaths: result.deaths,
					});
				}

				if (result.winners && result.winners.length > 0) {
					await realtime.publish(Resource.Realtime, Realtime.GameOver, {
						gameId,
						winners: result.winners,
					});
				}
			});

			return persistResult({
				gameId,
				continue: result.continue,
				waitSeconds: result.waitSeconds,
				phase: result.nextPhase,
				pollCount: result.pollCount ?? game.pollCount,
				phaseVersion: updated.phaseVersion,
			});
		}).catch(async (error) => {
			await recordAdvancePhaseError(gameId, error);
			throw error;
		}),
);
