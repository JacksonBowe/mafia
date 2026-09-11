# Stage 3: Loop Service

Goal: implement one backend service that advances exactly one phase per invocation.

Important data boundary: read player inputs and user ownership from `game_player`; keep `game.actors` as pure engine snapshot/output. `ActorState.id` is stable `actorId`. Before engine calls, map player `targetActorIds` from `game_player` into actor target numbers.

## Files To Add Or Change

- Add `packages/functions/src/gameloop/advance.ts`: Lambda handler.
- Add service code in `packages/core/src/game/loop.ts` or inside `packages/core/src/game/index.ts`.
- Prefer `packages/core/src/game/loop.ts` if code gets large; export through `packages/core/src/game/index.ts` if consumers need `Game.advanceLoop`.
- Update `packages/core/src/game/.agent_context.md` if it exists later; none existed at doc time.

## Handler Contract

Step Function invokes Lambda with:

```ts
type GameLoopInput = {
	gameId: string;
	continue?: boolean;
	waitSeconds?: number;
};
```

Lambda returns:

```ts
type GameLoopOutput = {
	gameId: string;
	continue: boolean;
	waitSeconds: number;
	phase?: GamePhase;
	pollCount?: number;
};
```

`waitSeconds` should already include `FRONTEND_SETTLE_SECONDS` when continuing.

Handler outline:

```ts
import { Game } from '@mafia/core/game/index';

export const handler = async (event: unknown) => {
	const input = GameLoopInputSchema.parse(event);
	return Game.advanceLoop({ gameId: input.gameId });
};
```

Do not trust incoming `waitSeconds` for phase duration.

## Idempotency Strategy

At minimum:

- Step Function execution name is `gameId`.
- `advanceLoop` checks current `game.status`.
- If game missing, completed, or cancelled, return `{ continue: false, waitSeconds: 0 }`.

Better:

- Add `phaseStartedAt` or `loopVersion` later if duplicate Lambda invocation proves possible.
- First pass can rely on Step Functions single execution plus transaction.

Do not add backwards-compatible aliases or old phase names. Use lowercase phases from `GamePhaseSchema`.

## Common Helpers

Inside loop service, useful helpers:

```ts
const aliveNumbers = (actors: ActorState[]) =>
	actors
		.filter((actor) => actor.alive && actor.number !== undefined)
		.map((actor) => actor.number!);

const buildEngineActors = (actors: ActorState[], players: GamePlayer[]) => {
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
};

const publishPhase = (gameId: string, phase: GamePhase, duration: number) =>
	realtime.publish(Resource.Realtime, Game.RealtimeEvents.PhaseChange, {
		gameId,
		phase,
		duration,
	});

const publishState = (gameId: string, state: GameState) =>
	realtime.publish(Resource.Realtime, Game.RealtimeEvents.State, { gameId, state });
```

Publish after transaction commit via `afterTx` whenever DB changed first.

## Phase Dispatcher

Pseudo-code:

```ts
export const advanceLoop = fn(z.object({ gameId: isULID() }), async ({ gameId }) =>
	createTransaction(async (tx) => {
		const game = await loadGameWithPlayersForUpdate(tx, gameId);

		if (!game || game.status !== 'active') {
			return stop(gameId);
		}

		const result = await processPhase(game);

		if (result.continue) {
			await persistPhase(tx, gameId, result.nextPhase, result.patch);
			await afterTx(async () => {
				await publishPhase(gameId, result.nextPhase, result.duration);
			});
		}

		return {
			gameId,
			continue: result.continue,
			waitSeconds: result.continue ? result.duration + FRONTEND_SETTLE_SECONDS : 0,
			phase: result.nextPhase,
			pollCount: result.pollCount,
		};
	}),
);
```

Use `createTransaction(..., 'serializable')` if concurrent writes are a concern. Otherwise default `read committed` is consistent with repo.

## Phase Behavior

### `pregame`

Behavior:

1. Publish each actor private role/actor data.
2. Move to `evening`.

Events:

- `Game.RealtimeEvents.ActorUpdate` or `RoleReveal` for each actor.
- `Game.RealtimeEvents.PhaseChange` for `evening`.

Return:

```ts
{ nextPhase: 'evening', duration: PHASE_DURATIONS.evening, continue: true }
```

Old loop jumped from `PREGAME` to `EVENING`; preserve that.

### `evening`

Behavior:

1. Build engine actors by mapping `game_player.targetActorIds` into current actor numbers.
2. Load engine with patched actors, `engineConfig`, and `engineState`.
3. Resolve night actions using `resolveGame({ actors, config, state })`.
4. Persist returned `state`, returned `actors`, and returned `events`.
5. Move to `night` for `engineResult.events.duration` seconds.

Code sketch:

```ts
const engineActors = buildEngineActors(actors, players);
const result = resolveGame({
	actors: engineActors,
	config: game.engineConfig,
	state: game.engineState,
});

updates.engineState = result.state;
updates.actors = result.actors;
updates.events = result.events;
nextPhase = 'night';
duration = result.events.duration;
```

Do not publish night events here. Persist them for `night` phase.

### `night`

Behavior:

1. Replay stored `game.events` over realtime.
2. Publish actor updates for all actors.
3. Publish public game state.
4. Clear `game_player.targetActorIds`.
5. Clear stored events.
6. Move to `morning`.

Do not `sleep` between event groups. The phase duration already represents total animation time. If granular per-event timing is needed later, use a second workflow design.

Event replay target mapping:

- Engine broadcast target is `BROADCAST_TARGET` from `@mafia/engine`, value currently `'*'`.
- If target is `'*'`, publish `Game.RealtimeEvents.Event` to public topic is not possible with current schema because it requires `actorId`. Use `realtime.publishRaw` or add a public night event schema.
- If target is actor/user id, publish `Game.RealtimeEvents.Event` with `{ gameId, actorId: target, eventId, message, duration }`.

Recommended first pass:

- Add a public realtime event definition for public game event, or use `State`/raw publish carefully.
- Avoid forcing broadcast events into actor private schema.

### `morning`

Behavior:

1. Find graveyard records whose death day equals current day.
2. Publish `Deaths` if any.
3. Publish `State`.
4. Load/check win with `loadGame({ actors, config, state })` or use engine result from `loadGame`.
5. If winners: persist `status: 'completed'`, publish `GameOver`, return `continue: false`.
6. Else move to `day`.

Current engine graveyard schema uses:

```ts
{
	(number, alias, cod, dod, role, will, alignment);
}
```

Current core `DeathRecordSchema` expects:

```ts
{
	(playerNumber, alias, role, deathCause, deathDay);
}
```

Map fields:

- `playerNumber = record.number`
- `deathCause = record.cod`
- `deathDay = record.dod`

### `day`

Behavior:

- No mutation besides phase.
- Move to `poll`.

### `poll`

Behavior:

1. Increment poll count.
2. Clear `onTrial` flags.
3. Clear verdicts.
4. Tally votes using alive players.
5. If `pollCount > 2`, reset poll count and move `evening`.
6. If majority target: set on trial, publish `Trial`, move `defense`.
7. Else stay `poll`.

Use current `Game.tallyVotes({ gameId, alivePlayers })`. It already uses alive list and `> floor(alive / 2)`, better than old attempt.

When next phase is `poll`, publish `TrialOver` to clear UI.

When next phase is `evening`, reset `pollCount` to `0` and publish `TrialOver`.

### `defense`

Behavior:

- Move to `trial`.

### `trial`

Behavior:

1. Tally verdicts with alive players.
2. If guilty: move `lynch`.
3. If innocent and poll count >= 2: reset poll count and move `evening`.
4. Else move `poll`.

Use current `Game.tallyVerdicts({ gameId, alivePlayers })`.

### `lynch`

Behavior:

1. Find player row with `onTrial === true`.
2. Build engine actors by mapping `game_player.targetActorIds` into current actor numbers.
3. Load engine with patched actors/config/state.
4. Call `Game.load(...).lynch(playerNumber)` or add engine helper if cleaner.
5. Persist updated engine state and actors.
6. Publish `LynchResult` if verdict counts available, then `State`.
7. Clear votes and verdicts.
8. If poll count > 2: reset poll count and move `evening`.
9. Else move `poll`.

Engine has `Game.lynch(number)` but top-level `@mafia/engine` does not expose `lynchGame` helper. Options:

- Use exported `Game` class from `@mafia/engine` directly.
- Add `lynchGame(input, number)` helper to `packages/engine/src/index.ts` if this is more consistent with `resolveGame`.

Recommended minimal add:

```ts
export const lynchGame = (input: EngineInput, number: number): EngineResult => {
	const { parsed, context, logger, actors, config } = bootstrap(input);
	const state = requireState(parsed, 'load');
	const game = Game.load(actors, config, state, context);
	game.lynch(number);
	const winners = summarizeWinners(game.checkForWin());
	return buildResult(game, winners, logger);
};
```

Do not end game on `lynch`; old semantics check winners in `morning` only. Preserve unless user requests change.

## Acceptance

- One Lambda invocation advances at most one phase.
- Returned output always includes `gameId`, `continue`, `waitSeconds`.
- No Lambda sleeps.
- Realtime publishes happen after DB commit when paired with DB mutations.
- `evening` stores events; `night` clears events.
- Player targets are read from `game_player.targetActorIds`, mapped to actor numbers for engine input, then cleared from `game_player.targetActorIds` in `night`.
- Winners end state machine only from `morning`.
