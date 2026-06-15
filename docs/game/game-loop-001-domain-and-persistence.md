# Stage 1: Domain And Persistence

Goal: add missing persisted data and core operations required by the loop before adding infrastructure.

Important boundary: `game.actors` is engine-owned snapshot data. Player inputs and user ownership must live on `game_player` rows. `ActorState.id` is the stable in-game `actorId`; `game_player.userId` is the owning account.

## Existing Files

- `packages/core/src/game/game.sql.ts`: Drizzle schema.
- `packages/core/src/game/schema.ts`: Zod schemas and shared types.
- `packages/core/src/game/index.ts`: domain operations and realtime event definitions.
- `packages/core/src/db/transaction.ts`: `createTransaction`, `useTransaction`, `afterTx`.
- `packages/engine/src/types.ts`: `GameEventGroupDump`, `EngineResult`, `GameState`, `ActorState`.

## Required Data Shape

The old loop split night handling into two phases:

- `evening`: resolve engine actions and persist generated event tree.
- `night`: replay persisted event tree to clients, then clear it.

Current `game` table has no field for that event tree. Add one.

Recommended DB field:

```ts
events: jsonb('events'),
```

Add to `gameTable` in `packages/core/src/game/game.sql.ts`. Keep nullable; most phases have no pending events.

Also add player identity/input columns to `game_player`, not `game.actors`:

```ts
actorId: text('actor_id').notNull(),
number: integer('player_number').notNull(),
voteTargetActorId: text('vote_target_actor_id'),
targetActorIds: jsonb('target_actor_ids').$type<string[]>().notNull().default([]),
```

This keeps user-submitted action choices separate from engine output. The loop maps `game_player.targetActorIds` to current actor numbers immediately before calling `loadGame`, `resolveGame`, or any engine helper, because the engine currently consumes target numbers.

User will run DB migration/actions manually. Do not run migration or DB commands unless asked.

## Schema Updates

In `packages/core/src/game/schema.ts`:

- Import `GameEventGroupDump` type if needed from `@mafia/engine`.
- Add schema for stored events. Use `z.unknown().nullable().optional()` if exact recursive schema is too much for this stage.
- Include `events` on `GameInfoSchema` as nullable/optional.
- Add `actorId`, numeric `number`, `voteTargetActorId`, and `targetActorIds` to `GamePlayerSchema`.

Minimal acceptable shape:

```ts
events: z.unknown().nullable().optional(),
```

Better shape can mirror engine event dump:

```ts
const GameEventDumpSchema = z.object({
	eventId: z.string(),
	targets: z.array(z.string()),
	message: z.string(),
});

type RecursiveEvent = z.infer<typeof GameEventDumpSchema> | {
	groupId: string | null;
	duration: number;
	events: RecursiveEvent[];
};
```

Do not overbuild recursive validation if it slows implementation. Engine is source of truth for event shape.

## Core Operations To Add

Add small domain helpers in `packages/core/src/game/index.ts`.

### Store Events

```ts
export const updateEvents = fn(
	z.object({ gameId: isULID(), events: z.unknown().nullable() }),
	async ({ gameId, events }) => useTransaction(async (tx) => {
		const [updated] = await tx
			.update(gameTable)
			.set({ events })
			.where(eq(gameTable.id, gameId))
			.returning({ id: gameTable.id });

		if (!updated) throw new InputError(Errors.GameNotFound, 'Game not found');
		return { gameId };
	}),
);
```

### Set Targets

Targets are player input. Store them on `game_player.targetActorIds`, not inside `game.actors`.

Recommended input:

```ts
{ gameId: string; userId: string; targetActorIds: string[] }
```

Implementation outline:

1. Load current game by `gameId` to inspect `game.actors` for possible target validation.
2. Parse `actors` as `ActorState[]` using `ActorStateSchema.array()`.
3. Find actor where `actor.id === userId`.
4. Validate each submitted target appears in that actor's current `possibleTargets` slot when possible.
5. Convert each target actor id to its current actor number and validate against `actor.possibleTargets`.
6. Update matching `game_player` row with `targetActorIds`.
7. Return `{ gameId, userId, targetActorIds }`.

Validation can be strict:

```ts
const numbersByActorId = new Map(actors.map((actor) => [actor.id, actor.number]));

for (const [index, targetActorId] of targetActorIds.entries()) {
	const targetNumber = numbersByActorId.get(targetActorId);
	const allowed = actor.possibleTargets[index] ?? [];
	if (targetNumber === undefined || !allowed.includes(targetNumber)) {
		throw new InputError(Errors.InvalidTarget, 'Invalid target');
	}
}
```

Add error code to `GameErrors` if needed:

```ts
InvalidTarget = 'game.invalid_target',
```

### Clear Targets

Needed during `night` processing after events replay.

Implementation outline:

- Update all `game_player` rows for `gameId` to `targetActorIds: []`.
- Do not mutate `game.actors` just to clear submitted targets.

### Build Engine Actors

Add helper used by loop processors before engine calls:

```ts
function buildEngineActors(actors: ActorState[], players: GamePlayer[]): ActorState[] {
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
```

This helper is the only place persisted player input targets enter engine input. `newGame` should receive sanitized initial actors with `targets: []`; `loadGame`/`resolveGame` should receive patched actors.

### Complete Game

Need explicit status update when winners found.

Current `updateState` accepts `status`, so use that if sufficient. If status-only update is needed, add `updateStatus`.

## Realtime Events Already Defined

`packages/core/src/game/index.ts` already defines:

- `PhaseChange`: `game.phase`
- `Vote`: `game.vote`
- `VoteCancel`: `game.votecancel`
- `Trial`: `game.trial`
- `TrialOver`: `game.trial_over`
- `State`: `game.state`
- `Deaths`: `game.deaths`
- `GameOver`: `game.over`
- `Terminated`: `game.terminated`
- `Verdict`: `game.verdict`
- `LynchResult`: `game.lynch_result`
- `ActorUpdate`: `game.actor`
- `Event`: `game.event`
- `RoleReveal`: `game.role_reveal`
- `TargetsUpdate`: `game.targets`

Do not rename event types without updating frontend schemas.

## Duration Constants

Create loop duration constants close to loop service, not schema:

```ts
const PHASE_DURATIONS = {
	pregame: 15,
	morning: 10,
	day: 10,
	poll: 10,
	defense: 10,
	trial: 10,
	lynch: 10,
	evening: 0,
	night: 10,
} as const;

const FRONTEND_SETTLE_SECONDS = 2;
```

Later config can move durations into `engineConfig.settings`. Do not block loop port on that.

## Acceptance

- `gameTable` can persist `events`.
- `GameInfoSchema.parse` accepts rows with `events`.
- Core can update/clear stored events.
- Core can set/clear player target inputs in `game_player.targetActorIds`.
- Backend has helper to patch player targets into engine actor input before engine calls.
- Lint passes for changed packages.
