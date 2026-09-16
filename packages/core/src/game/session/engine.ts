import type { ActorState } from '@mafia/engine';
import type { GamePlayer } from './schema';

/** Rehydrates engine target numbers from persisted player actor-ID selections. */
export function buildEngineActors(actors: ActorState[], players: GamePlayer[]): ActorState[] {
	const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
	const targetNumbersByActorId = new Map(
		players.map((player) => [
			player.actorId,
			player.targetActorIds
				.map((targetActorId) => actorsById.get(targetActorId)?.number)
				.filter((number): number is number => number !== undefined),
		]),
	);

	return actors.map((actor) => ({
		...actor,
		targets: targetNumbersByActorId.get(actor.id) ?? [],
	}));
}
