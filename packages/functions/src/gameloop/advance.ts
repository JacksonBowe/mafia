// Minimal stub. The real phase-advance service is implemented in
// game-loop-003-loop-service (Game.advanceLoop). This keeps the Step Function
// wiring deployable: it returns `continue: false` so the loop stops cleanly.
export const handler = (event: unknown) => {
	const gameId =
		typeof event === 'object' && event !== null && 'gameId' in event
			? (event as { gameId?: string }).gameId
			: undefined;

	return Promise.resolve({ gameId, continue: false, waitSeconds: 0 });
};
