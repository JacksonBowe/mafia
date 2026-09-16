import { lynchGame, loadGame, resolveGame, type ActorState, type GameEventGroupDump, type GameState, type StateGraveyardRecord, type WinnerSummary } from '@mafia/engine';
import { eq, sql } from 'drizzle-orm';
import { Resource } from 'sst';
import { z } from 'zod';
import { afterTx, createTransaction } from '../../db/transaction';
import { InputError, isULID } from '../../error';
import { realtime } from '../../realtime';
import { fn } from '../../util/fn';
import { gameTable } from '../game.sql';
import * as Assert from './assert';
import * as Events from './events';
import * as Log from './log';
import * as PhaseTransition from './phase-transition';
import type { EngineLogInput, GameLogInput } from './log';
import {
	GameErrors,
	GameSessionErrors as SessionErrors,
	GamePhaseSchema,
	GameSessionInfoSchema,
	type GamePhase,
	type GameSessionInfo,
	type GameStatus,
} from './schema';
import * as Ballot from './ballot';
import * as Engine from './engine';
import * as PlayerState from './player-state';
import * as Read from './read';

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

const nextPollOrEvening = (pollCount: number, overrides: Partial<AdvancePhaseResult> = {}) => {
	if (pollCount < MAX_POLLS) return enterPhase('poll', { pollCount, ...overrides });
	return enterPhase('evening', { pollCount: 0, ...overrides });
};

const getPhaseLabel = (phase: GamePhase, pollCount: number) => {
	if (phase === 'poll') return `Poll ${pollCount + 1}`;
	return `${phase.charAt(0).toUpperCase()}${phase.slice(1)}`;
};

const getPhaseSequence = (phase: GamePhase, pollCount: number) => {
	if (phase === 'poll') return pollCount;
	return 0;
};

/** Resolves submitted evening actions and enters night with the event timeline. */
const processEvening = (game: GameSessionInfo): AdvancePhaseResult => {
	const resolved = resolveGame({
		state: game.engineState,
		config: game.engineConfig,
		actors: Engine.buildEngineActors(game.actors, game.players),
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

/** Checks resolved night state for deaths and winners before entering morning. */
const processNight = (game: GameSessionInfo): AdvancePhaseResult => {
	const engineResult = loadGame({
		state: game.engineState,
		config: game.engineConfig,
		actors: Engine.buildEngineActors(game.actors, game.players),
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

/** Converts an error and up to three nested causes into JSON-safe audit data. */
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

/** Appends a lifecycle failure unless the game was already removed. */
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

			await Log.appendGameLog(tx, {
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

/**
 * Advances exactly one phase for a durable loop command. Locks the game row,
 * requires `expectedPhaseVersion`, and returns a persisted result for a
 * repeated `idempotencyKey`. Result contains loop continuation, next phase,
 * wait duration, poll count, and resulting phase version.
 */
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

			Assert.gameFound(gameRow);

			const previous = await PhaseTransition.get(gameId, idempotencyKey);
			if (previous) {
				return previous;
			}

			if (gameRow.phaseVersion !== expectedPhaseVersion) {
				throw new InputError(SessionErrors.GameInvalidState, 'Stale phase transition command');
			}

			const persistResult = (result: PhaseTransition.AdvancePhaseTransition) =>
				PhaseTransition.persist({ idempotencyKey, expectedPhaseVersion, result });

			const players = await Read.getPlayers(gameId);
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

			const aliveActorIds = getAliveActorIds(game.actors);
			let result: AdvancePhaseResult;
			const auditEntries: Array<Omit<GameLogInput, 'gameId'>> = [];

			switch (game.phase) {
				case 'pregame':
					result = enterPhase('evening');
					break;

				case 'day':
					await Ballot.clearVotes(gameId);
					await Ballot.clearVerdicts(gameId);
					await PlayerState.clearOnTrial(gameId);
					result = enterPhase('poll', { pollCount: 0 });
					break;

				case 'poll': {
					const nextPollCount = game.pollCount + 1;
					const voteTally = Ballot.tallyVotes(game.players, aliveActorIds);
					await Ballot.clearVotes(gameId);
					auditEntries.push({
						type: 'game.poll.tallied',
						phase: 'poll',
						data: { ...voteTally, pollCount: nextPollCount },
					});

					if (voteTally.winner) {
						const trialPlayer = await PlayerState.setOnTrial(gameId, voteTally.winner);

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

					const verdictTally = Ballot.tallyVerdicts(game.players, aliveActorIds);
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

					await Ballot.clearVerdicts(gameId);
					await PlayerState.clearOnTrial(gameId);
					result = nextPollOrEvening(game.pollCount, { lynchResult, trialOver: true });
					break;
				}

				case 'lynch': {
					const trialPlayer = game.players.find((player) => player.onTrial);
					if (!trialPlayer) {
						throw new InputError(SessionErrors.GameInvalidState, 'No player on trial');
					}
					const verdictTally = Ballot.tallyVerdicts(game.players, aliveActorIds);

					const lynched = lynchGame({
						state: game.engineState,
						config: game.engineConfig,
						actors: Engine.buildEngineActors(game.actors, game.players),
						actorNumber: trialPlayer.number,
					});
					await PlayerState.clearOnTrial(gameId);
					await Ballot.clearVerdicts(gameId);
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
					await PlayerState.clearTargets(gameId);
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

			Assert.gameFound(updated);

			await Log.appendGameLog(tx, {
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
				await Log.appendGameLog(tx, { gameId, ...entry });
			}
			if (result.trialActorNumber !== undefined) {
				await Log.appendGameLog(tx, {
					gameId,
					type: 'game.trial.started',
					phase: result.nextPhase,
					data: { actorNumber: result.trialActorNumber },
				});
			}
			if (result.trialOver) {
				await Log.appendGameLog(tx, {
					gameId,
					type: 'game.trial.ended',
					phase: game.phase,
					data: { nextPhase: result.nextPhase },
				});
			}
			if (result.deaths && result.deaths.length > 0) {
				await Log.appendGameLog(tx, {
					gameId,
					type: 'game.deaths.announced',
					phase: result.nextPhase,
					data: { deaths: result.deaths },
				});
			}
			if (result.winners && result.winners.length > 0) {
				await Log.appendGameLog(tx, {
					gameId,
					type: 'game.over',
					phase: result.nextPhase,
					data: { winners: result.winners },
				});
			}
			for (const engineLog of result.engineLogs ?? []) {
				const engineLogId = await Log.appendEngineLog(tx, { gameId, ...engineLog });
				const type =
					engineLog.operation === 'resolve'
						? 'game.engine.resolved'
						: engineLog.operation === 'lynch'
							? 'game.lynch.resolved'
							: 'game.engine.win_checked';
				await Log.appendGameLog(tx, {
					gameId,
					type,
					phase: engineLog.phase,
					data: { engineLogId, operation: engineLog.operation, ...engineLog.data },
				});
			}

			await afterTx(async () => {
				const nextPollCount = result.pollCount ?? game.pollCount;

				await realtime.publish(Resource.Realtime, Events.Realtime.PhaseChange, {
					gameId,
					phase: result.nextPhase,
					duration: result.waitSeconds,
					label: getPhaseLabel(result.nextPhase, nextPollCount),
					sequence: getPhaseSequence(result.nextPhase, nextPollCount),
				});

				if (result.trialActorNumber !== undefined) {
					await realtime.publish(Resource.Realtime, Events.Realtime.Trial, {
						gameId,
						actorNumber: result.trialActorNumber,
					});
				}

				if (result.trialOver) {
					await realtime.publish(Resource.Realtime, Events.Realtime.TrialOver, { gameId });
				}

				if (result.lynchResult) {
					await realtime.publish(Resource.Realtime, Events.Realtime.LynchResult, {
						gameId,
						...result.lynchResult,
					});
				}

				if (result.engineState) {
					await realtime.publish(Resource.Realtime, Events.Realtime.State, {
						gameId,
						state: result.engineState,
					});
				}

				if (result.deaths && result.deaths.length > 0) {
					await realtime.publish(Resource.Realtime, Events.Realtime.Deaths, {
						gameId,
						deaths: result.deaths,
					});
				}

				if (result.winners && result.winners.length > 0) {
					await realtime.publish(Resource.Realtime, Events.Realtime.GameOver, {
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
