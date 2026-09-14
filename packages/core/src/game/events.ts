import { ActorStateSchema, StateGraveyardRecordSchema, WinnerSummarySchema } from '@mafia/engine';
import { z } from 'zod';
import { isULID } from '../error';
import { defineRealtimeEvent } from '../realtime';
import { GameTopics, VerdictSchema } from './schema';

// ---------------------
// Realtime events (server-only — depend on defineRealtimeEvent / IoT)
// ---------------------

export const RealtimeEvents = {
	// ==================
	// Public Events (broadcast to all players)
	// ==================

	/**
	 * Phase change event - sent when the game transitions to a new phase.
	 * Frontend uses this to update UI and start countdown timer.
	 */
	PhaseChange: defineRealtimeEvent(
		'game.phase',
		z.object({
			gameId: isULID(),
			phase: z.string(),
			duration: z.number().int(),
			label: z.string(),
			sequence: z.number().int(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Vote event - sent when a player casts a vote during POLL phase.
	 */
	Vote: defineRealtimeEvent(
		'game.vote',
		z.object({
			gameId: isULID(),
			voterActorNumber: z.number().int(),
			targetActorNumber: z.number().int(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Vote cancel event - sent when a player cancels their vote.
	 */
	VoteCancel: defineRealtimeEvent(
		'game.votecancel',
		z.object({
			gameId: isULID(),
			voterActorNumber: z.number().int(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Trial event - sent when a player is put on trial.
	 */
	Trial: defineRealtimeEvent(
		'game.trial',
		z.object({
			gameId: isULID(),
			actorNumber: z.number().int(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Trial over event - sent when trial phase ends (moving to evening).
	 */
	TrialOver: defineRealtimeEvent(
		'game.trial_over',
		z.object({
			gameId: isULID(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * State update event - sent when game state changes.
	 * Contains public game state that all players can see.
	 */
	State: defineRealtimeEvent(
		'game.state',
		z.object({
			gameId: isULID(),
			state: z.unknown(), // GameState from engine
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Deaths event - sent during MORNING phase to announce deaths from the night.
	 */
	Deaths: defineRealtimeEvent(
		'game.deaths',
		z.object({
			gameId: isULID(),
			deaths: z.array(StateGraveyardRecordSchema),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Game over event - sent when the game ends with winners.
	 */
	GameOver: defineRealtimeEvent(
		'game.over',
		z.object({
			gameId: isULID(),
			winners: z.array(WinnerSummarySchema),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Game terminated event - sent when the game is aborted/cancelled.
	 */
	Terminated: defineRealtimeEvent(
		'game.terminated',
		z.object({
			gameId: isULID(),
			error: z.string().optional(),
			message: z.string().optional(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Verdict event - sent when a player submits a verdict during TRIAL phase.
	 */
	Verdict: defineRealtimeEvent(
		'game.verdict',
		z.object({
			gameId: isULID(),
			voterActorNumber: z.number().int(),
			verdict: VerdictSchema,
		}),
		(p) => GameTopics.public(p.gameId),
	),

	/**
	 * Lynch result event - sent after TRIAL phase to announce the verdict result.
	 */
	LynchResult: defineRealtimeEvent(
		'game.lynch_result',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			guiltyCount: z.number().int(),
			abstainCount: z.number().int(),
			innocentCount: z.number().int(),
			isGuilty: z.boolean(),
		}),
		(p) => GameTopics.public(p.gameId),
	),

	// ==================
	// Private Events (to specific player via actor channel)
	// ==================

	/**
	 * Actor update event - sent to a specific player with their private actor data.
	 * Includes role, targets, allies, and other private information.
	 */
	ActorUpdate: defineRealtimeEvent(
		'game.actor',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			actor: ActorStateSchema,
		}),
		(p) => GameTopics.actor(p.gameId, p.actorId),
	),

	/**
	 * Game event - sent to specific player(s) with night action results.
	 * e.g., "You were attacked but survived due to Night Immunity"
	 */
	Event: defineRealtimeEvent(
		'game.event',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			eventId: z.string(),
			message: z.string(),
			duration: z.number().int().default(0),
		}),
		(p) => GameTopics.actor(p.gameId, p.actorId),
	),

	/**
	 * Role reveal event - sent to a player during PREGAME to reveal their role.
	 */
	RoleReveal: defineRealtimeEvent(
		'game.role_reveal',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			role: z.string(),
			allies: z.array(
				z.object({
					playerNumber: z.number().int(),
					alias: z.string(),
					role: z.string().optional(),
				}),
			),
		}),
		(p) => GameTopics.actor(p.gameId, p.actorId),
	),

	/**
	 * Targets update event - sent to a player when their available targets change.
	 */
	TargetsUpdate: defineRealtimeEvent(
		'game.targets',
		z.object({
			gameId: isULID(),
			actorId: z.string(),
			possibleTargets: z.array(z.array(z.number().int())),
		}),
		(p) => GameTopics.actor(p.gameId, p.actorId),
	),
};

