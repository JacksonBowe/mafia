# Stage 4: API And SDK

Goal: expose player inputs that feed the loop: vote, verdict, and night targets. Also start the Step Function when lobby starts.

## Existing Files

- `packages/functions/src/api/game.ts`: currently only `GET /game`.
- `packages/functions/src/api/lobby.ts`: creates game on `POST /lobby/:lobbyId/start`.
- `packages/functions/src/api/schemas/`: shared API request schemas.
- `packages/sdk/src/game.ts`: currently only `getGame()`.
- `packages/sdk/src/index.ts`: re-exports SDK types.
- `packages/core/src/game/index.ts`: has vote/verdict helpers.

## API Schemas

Add `packages/functions/src/api/schemas/game.schemas.ts`.

Suggested schemas:

```ts
import { z } from 'zod';

export const SubmitVoteJsonSchema = z.object({
	target: z.number().int().positive(),
});
export type SubmitVoteJson = z.infer<typeof SubmitVoteJsonSchema>;

export const SubmitVerdictJsonSchema = z.object({
	verdict: z.enum(['guilty', 'innocent']).nullable(),
});
export type SubmitVerdictJson = z.infer<typeof SubmitVerdictJsonSchema>;

export const SubmitTargetsJsonSchema = z.object({
	targets: z.array(z.number().int().positive()).max(15),
});
export type SubmitTargetsJson = z.infer<typeof SubmitTargetsJsonSchema>;
```

Export from `packages/functions/src/api/schemas/index.ts` if that barrel is used.

## Resolve Current Player

Each action should:

1. `const actor = assertActor('user')`.
2. Load active game with `Game.getByPlayer({ userId })` or `Game.sync({ userId })` depending needed shape.
3. Find current actor/player number from sync/game data.
4. Apply mutation.

Avoid trusting client-sent `gameId` for player actions. Active game should derive from authenticated user.

## POST `/game/vote`

Handler outline:

```ts
gameRoutes.post('/vote', zValidator('json', SubmitVoteJsonSchema), async (c) => {
	const { target } = c.req.valid('json');
	const actor = assertActor('user');
	const userId = actor.properties.userId;

	const game = await Game.getByPlayer({ userId });
	if (!game) throw new InputError(Game.Errors.GameNotFound, 'Game not found');

	if (game.phase !== 'poll') throw new InputError(Game.Errors.GameInvalidState, 'Not in poll phase');

	const player = game.players.find((p) => p.userId === userId);
	if (!player) throw new InputError(Game.Errors.PlayerNotFound, 'Player not found');

	const result = await Game.submitVote({
		gameId: game.id,
		voterNumber: Number(player.number),
		targetNumber: target,
	});

	// Publish realtime after mutation.
	// If result.vote === null, publish VoteCancel. Else publish Vote.

	return c.json({ success: true, vote: result.vote });
});
```

Publish:

- `Game.RealtimeEvents.Vote` with `{ gameId, voter, target }` for new/change.
- `Game.RealtimeEvents.VoteCancel` with `{ gameId, voter }` for cancel.

Current `VoteCancel` schema has no target. Frontend should not expect target.

## POST `/game/verdict`

Allowed phase: `trial` only.

Rules:

- Player on trial should not submit verdict.
- Dead players should not submit verdict.
- `null` can clear verdict if schema allows it; old API allowed delete. If UI only submits final verdict, skip nullable and require enum.

Use `Game.submitVerdict` for enum values. Add a clear helper if `null` is supported.

Publish `Game.RealtimeEvents.Verdict` if you want live verdict counters. Payload does not include target, only voter and verdict.

## POST `/game/targets`

Allowed phase: likely `night` or `evening` depending UI semantics. Old UI submitted targets before resolution; in current flow players should choose during `night` after prior night results/morning/day? Decide based on UX:

- Old loop: actions were submitted between phases and read by `evening` resolution.
- Current phase naming means `night` is event playback, not action input. This is confusing but preserved from old flow.

Recommended first pass:

- Allow targets during `day`, `poll`, `defense`, `trial`, `lynch`, and `night`; the engine validates and clears stale/illegal targets during `evening`.
- Or stricter: allow only `night`; but note `night` in old semantics is playback, so users may have little time to choose.

Use `Game.setTargets({ gameId, userId, targets })` from Stage 1. This updates `game_player.targets`, not `game.actors`.

Do not let player APIs write `game.actors` directly. `game.actors` should only change when backend loop persists engine output after `newGame`, `resolveGame`, or `lynchGame`.

Return updated actor or `{ success: true }`.

## Start Step Function On Lobby Start

In `packages/functions/src/api/lobby.ts`, after `Game.create` transaction succeeds, start game loop.

Important: do not start Step Function inside DB transaction unless the start happens in `afterTx`.

Recommended:

```ts
void afterTx(async () => {
	await realtime.publish(...LobbyStarted...);
	await startGameLoop(gameId);
});
```

If `afterTx` callback throws, transaction is already committed. Log start errors and publish `game.terminated` or surface as 500 depending desired behavior. Safer first pass: let API fail if loop cannot start, because game without loop is broken. But transaction already committed, so failure handling must mark game cancelled if possible.

Idempotent start helper:

```ts
async function startGameLoop(gameId: string) {
	try {
		await client.send(new StartExecutionCommand({
			stateMachineArn: Resource.GameLoopMachine.arn,
			name: gameId,
			input: JSON.stringify({ gameId }),
		}));
	} catch (error) {
		if (isExecutionAlreadyExists(error)) return;
		throw error;
	}
}
```

Confirm actual SST resource property names. They may differ from `.arn`.

## SDK Methods

Update `packages/sdk/src/game.ts`:

```ts
submitVote: (input: { target: number }): Promise<{ success: true; vote: number | null }> =>
	request({ method: 'POST', url: '/game/vote', data: input }),

submitVerdict: (input: { verdict: 'guilty' | 'innocent' }): Promise<{ success: true }> =>
	request({ method: 'POST', url: '/game/verdict', data: input }),

submitTargets: (input: { targets: number[] }): Promise<{ success: true }> =>
	request({ method: 'POST', url: '/game/targets', data: input }),
```

Update `packages/sdk/src/index.ts` to export input types if added.

## Acceptance

- `GET /game` still works.
- Vote endpoint toggles vote and publishes correct realtime event.
- Verdict endpoint stores verdict and optionally publishes realtime event.
- Targets endpoint updates actor targets in `game.actors`.
- Lobby start starts exactly one state machine execution for `gameId`.
- SDK exposes all new game methods.
