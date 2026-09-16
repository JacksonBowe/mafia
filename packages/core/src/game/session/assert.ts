import { InputError } from '../../error';
import { GameErrors, GameSessionErrors as SessionErrors } from './schema';

export function gameFound<T>(game: T | null | undefined): asserts game is NonNullable<T> {
	if (!game) throw new InputError(GameErrors.GameNotFound, 'Game not found');
}

export function gameActive(game: { status: string }) {
	if (game.status !== 'active') {
		throw new InputError(SessionErrors.GameInvalidState, 'Game is not active');
	}
}

export function playerFound<T>(player: T | null | undefined): asserts player is NonNullable<T> {
	if (!player) throw new InputError(SessionErrors.PlayerNotFound, 'Player not found');
}

export function actorAlive<T extends { alive: boolean }>(
	actor: T,
): asserts actor is T & { alive: true } {
	if (!actor.alive) {
		throw new InputError(SessionErrors.PlayerNotAlive, 'Player is not alive');
	}
}
