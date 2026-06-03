# Stage 1: Domain And Persistence

Goal: add missing persisted data and core operations required by the loop before adding infrastructure.

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

User will run DB migration/actions manually. Do not run migration or DB commands unless asked.

## Schema Updates

In `packages/core/src/game/schema.ts`:

- Import `GameEventGroupDump` type if needed from `@mafia/engine`.
- Add schema for stored events. Use `z.unknown().nullable().optional()` if exact recursive schema is too much for this stage.
- Include `events` on `GameInfoSchema` as nullable/optional.

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

Actors are stored as JSONB on `game.actors`. Add helper to update one actor's `targets` by player/user identity.

Recommended input:

```ts
{ gameId: string; userId: string; targets: number[] }
```

Implementation outline:

1. Load game by `gameId`.
2. Parse `actors` as `ActorState[]` using `ActorStateSchema.array()`.
3. Find actor where `actor.id === userId`.
4. Validate each submitted target appears in that actor's current `possibleTargets` slot when possible.
5. Write updated full `actors` array back to `gameTable.actors`.
6. Return updated actor.

Validation can be strict:

```ts
for (const [index, target] of targets.entries()) {
	const allowed = actor.possibleTargets[index] ?? [];
	if (allowed.length > 0 && !allowed.includes(target)) {
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

- Load `actors`.
- Map each actor to `{ ...actor, targets: [] }`.
- Persist `actors`.

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
- Core can set/clear actor targets in `game.actors`.
- Lint passes for changed packages.
