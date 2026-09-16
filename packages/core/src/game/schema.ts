// Pure public game contracts shared with the SDK.
import { ActorStateSchema, GameConfigSchema, GameStateSchema } from '@mafia/engine';
import { z } from 'zod';
import { isULID } from '../error/schema';

const CreateGamePlayerSchema = z.object({
	userId: isULID(),
	actorId: z.string().min(1),
	number: z.number().int().positive(),
});

/**
 * Validates engine output before first persistence. Cross-record invariants
 * require unique actor/user/number identities and player rows that reference
 * engine actors with matching assigned numbers.
 */
export const CreateGameInputSchema = z
	.object({
		engineState: GameStateSchema,
		engineConfig: GameConfigSchema,
		actors: z.array(ActorStateSchema),
		engineLog: z.array(z.string()),
		players: z.array(CreateGamePlayerSchema),
	})
	.superRefine((input, ctx) => {
		const actorsById = new Map<string, (typeof input.actors)[number]>();
		for (const [index, actor] of input.actors.entries()) {
			if (actorsById.has(actor.id)) {
				ctx.addIssue({
					code: 'custom',
					path: ['actors', index, 'id'],
					message: 'Actor IDs must be unique',
				});
			}
			actorsById.set(actor.id, actor);
		}

		const userIds = new Set<string>();
		const actorIds = new Set<string>();
		const playerNumbers = new Set<number>();
		for (const [index, player] of input.players.entries()) {
			const addUniqueIssue = (
				values: Set<string | number>,
				value: string | number,
				field: 'userId' | 'actorId' | 'number',
				message: string,
			) => {
				if (values.has(value)) {
					ctx.addIssue({ code: 'custom', path: ['players', index, field], message });
				}
				values.add(value);
			};

			addUniqueIssue(userIds, player.userId, 'userId', 'Player user IDs must be unique');
			addUniqueIssue(actorIds, player.actorId, 'actorId', 'Player actor IDs must be unique');
			addUniqueIssue(playerNumbers, player.number, 'number', 'Player numbers must be unique');

			const actor = actorsById.get(player.actorId);
			if (!actor) {
				ctx.addIssue({
					code: 'custom',
					path: ['players', index, 'actorId'],
					message: 'Player actor ID must reference an engine actor',
				});
			} else if (actor.number !== player.number) {
				ctx.addIssue({
					code: 'custom',
					path: ['players', index, 'number'],
					message: 'Player number must match its engine actor number',
				});
			}
		}
	});

export {
	ClientGameInfoSchema,
	GameErrors,
	GameInfoSchema,
	GamePhaseSchema,
	GamePlayerSchema,
	GameSessionErrors,
	GameSessionInfoSchema,
	GameStatusSchema,
	GameSyncResponseSchema,
	GameTopics,
	VerdictSchema,
} from './session/schema';
export type {
	ActorState,
	ClientGameInfo,
	GameConfig,
	GameEventGroupDump,
	GameInfo,
	GamePhase,
	GamePlayer,
	GameSessionInfo,
	GameState,
	GameStatus,
	GameSyncResponse,
	Verdict,
} from './session/schema';
