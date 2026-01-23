import { DrizzleQueryError, eq, inArray } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';
import { afterTx, createTransaction, useTransaction } from '../db/transaction';
import {
	EntityBaseSchema,
	getConstraintName,
	isUniqueViolation,
	RelatedEntitySchema,
} from '../db/types';
import { InputError, isULID } from '../error';
import { defineRealtimeEvent, realtime } from '../realtime';
import { userTable } from '../user/user.sql';
import { fn } from '../util/fn';
import { lobbyMemberTable, lobbyTable } from './lobby.sql';
import * as Member from './member';
import { Resource } from 'sst';
export * as Lobby from './';
export { Member };

export enum Errors {
	LobbyExists = 'lobby.exists',
	LobbyDuplicateHost = 'lobby.duplicate_host',
	LobbyNotFound = 'lobby.not_found',
	LobbyDeleteFailed = 'lobby.delete_failed',
}

export const RealtimeEvents = {
	LobbyTerminated: defineRealtimeEvent(
		'lobby.terminated',
		z.object({
			lobbyId: isULID(),
		}),
		(p) => `lobby/${p.lobbyId}`,
	),
	LobbyStarted: defineRealtimeEvent(
		'lobby.started',
		z.object({
			lobbyId: isULID(),
			gameId: isULID(),
		}),
		(p) => `lobby/${p.lobbyId}`,
	),
};

export const LobbyInfoSchema = EntityBaseSchema.extend({
	name: z.string(),
	host: RelatedEntitySchema,
	config: z.object({}).passthrough(),
	members: z.array(RelatedEntitySchema),
});

export type LobbyInfo = z.infer<typeof LobbyInfoSchema>;

export const create = fn(
	z.object({
		hostId: isULID(),
		name: z.string(),
		config: z.object({}),
	}),
	async ({ hostId, name, config }) => {
		const id = ulid();

		try {
			await createTransaction(async (tx) => {
				const [newLobby] = await tx
					.insert(lobbyTable)
					.values({
						id,
						hostId,
						name,
						config,
					})
					.returning();

				// Host must also be a member (atomic)
				await Member.add({ lobbyId: id, userId: hostId });

				return newLobby;
			});

			return get({ lobbyId: id });
		} catch (err) {
			if (err instanceof DrizzleQueryError) {
				if (isUniqueViolation(err)) {
					const constraint = getConstraintName(err);

					if (constraint === 'lobby_name_uq') {
						throw new InputError(Errors.LobbyExists, 'Lobby name already in use');
					}

					if (constraint === 'lobby_host_uq') {
						throw new InputError(
							Errors.LobbyDuplicateHost,
							'User is already hosting a lobby',
						);
					}
				}
			}

			throw err;
		}
	},
);

export const list = () =>
	useTransaction(async (tx) => {
		const lobbies = await tx
			.select({
				id: lobbyTable.id,
				name: lobbyTable.name,
				host: {
					id: userTable.id,
					name: userTable.name,
				},
				config: lobbyTable.config,
				createdAt: lobbyTable.createdAt,
				updatedAt: lobbyTable.updatedAt,
			})
			.from(lobbyTable)
			.innerJoin(userTable, eq(userTable.id, lobbyTable.hostId));

		if (lobbies.length === 0) return [];

		const lobbyIds = lobbies.map((l) => l.id);

		const membersRows = await tx
			.select({
				lobbyId: lobbyMemberTable.lobbyId,
				id: userTable.id,
				name: userTable.name,
			})
			.from(lobbyMemberTable)
			.innerJoin(userTable, eq(userTable.id, lobbyMemberTable.userId))
			.where(inArray(lobbyMemberTable.lobbyId, lobbyIds));

		const membersByLobby = new Map<string, Array<{ id: string; name: string }>>();
		for (const row of membersRows) {
			const arr = membersByLobby.get(row.lobbyId) ?? [];
			arr.push({ id: row.id, name: row.name });
			membersByLobby.set(row.lobbyId, arr);
		}

		return lobbies.map((l) =>
			LobbyInfoSchema.parse({
				...l,
				members: membersByLobby.get(l.id) ?? [],
			}),
		);
	});

export const get = fn(
	z.object({
		lobbyId: isULID(),
	}),
	async ({ lobbyId }) =>
		useTransaction(async (tx) => {
			const [lobby] = await tx
				.select({
					id: lobbyTable.id,
					name: lobbyTable.name,
					host: {
						id: userTable.id,
						name: userTable.name,
					},
					config: lobbyTable.config,
					createdAt: lobbyTable.createdAt,
					updatedAt: lobbyTable.updatedAt,
				})
				.from(lobbyTable)
				.innerJoin(userTable, eq(userTable.id, lobbyTable.hostId))
				.where(eq(lobbyTable.id, lobbyId));

			if (!lobby) {
				throw new InputError(Errors.LobbyNotFound, 'Lobby not found');
			}

			const members = await tx
				.select({
					id: userTable.id,
					name: userTable.name,
				})
				.from(lobbyMemberTable)
				.innerJoin(userTable, eq(userTable.id, lobbyMemberTable.userId))
				.where(eq(lobbyMemberTable.lobbyId, lobbyId));

			return LobbyInfoSchema.parse({
				...lobby,
				members,
			});
		}),
);

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 15;

export const prepareForStart = fn(
	z.object({
		lobbyId: isULID(),
		hostId: isULID(),
	}),
	async ({ lobbyId, hostId }) =>
		useTransaction(async (tx) => {
			// Get lobby with host check
			const [lobby] = await tx
				.select({
					id: lobbyTable.id,
					name: lobbyTable.name,
					hostId: lobbyTable.hostId,
					config: lobbyTable.config,
				})
				.from(lobbyTable)
				.where(eq(lobbyTable.id, lobbyId));

			if (!lobby) {
				throw new InputError(Errors.LobbyNotFound, 'Lobby not found');
			}

			if (lobby.hostId !== hostId) {
				throw new InputError('lobby.host_required', 'Only the host can start the game');
			}

			// Get members with user info
			const members = await tx
				.select({
					userId: userTable.id,
					name: userTable.name,
				})
				.from(lobbyMemberTable)
				.innerJoin(userTable, eq(userTable.id, lobbyMemberTable.userId))
				.where(eq(lobbyMemberTable.lobbyId, lobbyId));

			if (members.length < MIN_PLAYERS) {
				throw new InputError(
					'lobby.insufficient_players',
					`Need at least ${MIN_PLAYERS} players to start`,
					{ current: members.length, required: MIN_PLAYERS },
				);
			}

			if (members.length > MAX_PLAYERS) {
				throw new InputError(
					'lobby.too_many_players',
					`Cannot exceed ${MAX_PLAYERS} players`,
					{ current: members.length, max: MAX_PLAYERS },
				);
			}

			return {
				lobbyId: lobby.id,
				lobbyName: lobby.name,
				config: lobby.config,
				members,
			};
		}),
);

export const terminate = fn(
	z.object({
		lobbyId: isULID(),
	}),
	async ({ lobbyId }) =>
		useTransaction(async (tx) => {
			const [lobby] = await tx
				.select({ id: lobbyTable.id })
				.from(lobbyTable)
				.where(eq(lobbyTable.id, lobbyId))
				.limit(1);

			if (!lobby) {
				throw new InputError(Errors.LobbyNotFound, 'Lobby does not exist');
			}

			const deletedMembers = await tx
				.delete(lobbyMemberTable)
				.where(eq(lobbyMemberTable.lobbyId, lobbyId))
				.returning({ id: lobbyMemberTable.id });

			const deletedLobby = await tx
				.delete(lobbyTable)
				.where(eq(lobbyTable.id, lobbyId))
				.returning({ id: lobbyTable.id });

			console.log('Deleted members:', deletedMembers.length);
			console.log('Deleted lobby:', deletedLobby.length);
			if (deletedLobby.length === 0) {
				throw new InputError(
					Errors.LobbyDeleteFailed,
					'Lobby could not be deleted (permission/RLS or it no longer exists).',
					{ deletedMembers: deletedMembers.length },
				);
			}

			void afterTx(() => {
				void realtime.publish(Resource.Realtime, RealtimeEvents.LobbyTerminated, {
					lobbyId,
				});
			});

			return { lobbyId };
		}),
);
