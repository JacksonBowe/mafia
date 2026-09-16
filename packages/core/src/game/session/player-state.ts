import { and, eq } from 'drizzle-orm';
import { useTransaction } from '../../db/transaction';
import { InputError } from '../../error';
import { gamePlayerTable } from '../game.sql';
import { GameSessionErrors as SessionErrors } from './schema';

// Internal persistence helpers join their caller's transaction via useTransaction.
export const setOnTrial = async (gameId: string, actorId: string) =>
	useTransaction(async (tx) => {
		await tx
			.update(gamePlayerTable)
			.set({ onTrial: false })
			.where(eq(gamePlayerTable.gameId, gameId));

		const [player] = await tx
			.update(gamePlayerTable)
			.set({ onTrial: true })
			.where(and(eq(gamePlayerTable.gameId, gameId), eq(gamePlayerTable.actorId, actorId)))
			.returning({ number: gamePlayerTable.number });
		if (!player) throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
		return player;
	});

export const clearOnTrial = async (gameId: string) =>
	useTransaction(async (tx) => {
		await tx
			.update(gamePlayerTable)
			.set({ onTrial: false })
			.where(eq(gamePlayerTable.gameId, gameId));
	});

export const clearTargets = async (gameId: string) =>
	useTransaction(async (tx) => {
		await tx
			.update(gamePlayerTable)
			.set({ targetActorIds: [] })
			.where(eq(gamePlayerTable.gameId, gameId));
	});
