# Stage 5: Frontend Events And UI State

Goal: handle game loop realtime events and expose enough state for existing UI components to react.

## Existing Files

- `packages/web/app/src/stores/game.ts`: sync data, actor, config, phase metadata.
- `packages/web/app/src/lib/game/events.ts`: event schemas and bus handlers.
- `packages/web/app/src/stores/realtime.ts`: MQTT connection and topic subscribe.
- `packages/web/app/src/pages/GamePage.vue`: current game page; timer hard-coded to `200`.
- `packages/web/app/src/components/game/**`: game UI components.
- `packages/sdk/src/game.ts`: API methods after Stage 4.

## Event Name Mapping

Backend realtime event types from `packages/core/src/game/index.ts`:

| Backend type | Frontend bus key |
| ------------ | ---------------- |
| `game.phase` | `realtime.game.phase` |
| `game.vote` | `realtime.game.vote` |
| `game.votecancel` | `realtime.game.votecancel` |
| `game.trial` | `realtime.game.trial` |
| `game.trial_over` | `realtime.game.trial_over` |
| `game.state` | `realtime.game.state` |
| `game.deaths` | `realtime.game.deaths` |
| `game.over` | `realtime.game.over` |
| `game.terminated` | `realtime.game.terminated` |
| `game.verdict` | `realtime.game.verdict` |
| `game.lynch_result` | `realtime.game.lynch_result` |
| `game.actor` | `realtime.game.actor` |
| `game.event` | `realtime.game.event` |
| `game.role_reveal` | `realtime.game.role_reveal` |
| `game.targets` | `realtime.game.targets` |

The bus implementation prefixes realtime events. Confirm `createBus` behavior before adding schemas; existing file already expects `realtime.game.phase`.

## Store Additions

Extend `packages/web/app/src/stores/game.ts` state:

```ts
votes: {} as Record<number, number>,
verdicts: {} as Record<number, 'guilty' | 'innocent'>,
playerOnTrial: null as number | null,
deaths: [] as DeathRecord[],
winners: [] as WinnerSummary[],
eventMessages: [] as Array<{ eventId: string; message: string; duration: number }>,
```

Types can come from `@mafia/sdk` if exported. If not exported yet, define local narrow types from event schemas.

Add actions:

```ts
applyVote(voter: number, target: number) {
	this.votes = { ...this.votes, [voter]: target };
}

applyVoteCancel(voter: number) {
	const next = { ...this.votes };
	delete next[voter];
	this.votes = next;
}

applyTrial(playerNumber: number) {
	this.playerOnTrial = playerNumber;
}

applyTrialOver() {
	this.playerOnTrial = null;
	this.verdicts = {};
}

applyDeaths(deaths: DeathRecord[]) {
	this.deaths = deaths;
}

applyGameOver(winners: WinnerSummary[]) {
	this.winners = winners;
}
```

Clear these fields in `clearGame()`.

## Event Schemas

Update `packages/web/app/src/lib/game/events.ts` schemas. Match backend payload exactly.

Examples:

```ts
'realtime.game.vote': z.object({
	gameId: ULID,
	voterActorId: z.string(),
	targetActorId: z.string(),
}),

'realtime.game.votecancel': z.object({
	gameId: ULID,
	voterActorId: z.string(),
}),

'realtime.game.trial': z.object({
	gameId: ULID,
	actorId: z.string(),
}),

'realtime.game.trial_over': z.object({
	gameId: ULID,
}),

'realtime.game.actor': z.object({
	gameId: ULID,
	actorId: z.string(),
	actor: z.unknown(),
}),
```

`DeathRecordSchema` and `WinnerSummarySchema` are exported by SDK if `packages/sdk/src/types.ts` re-exports core types. Prefer imported schemas when available.

## Event Handlers

Each handler should guard current game:

```ts
if (gameStore.info?.id !== gameId) return;
```

Handlers:

- `phase`: `applyPhaseEvent(phase, duration)`.
- `state`: `applyStateEvent(state)`, then `syncFromServer()` to refresh actor/private data.
- `actor`: if `actorId === gameStore.actor?.id`, set `gameStore.actor`.
- `vote`: `applyVote(voter, target)`.
- `votecancel`: `applyVoteCancel(voter)`.
- `trial`: `applyTrial(playerNumber)`.
- `trial_over`: `applyTrialOver()`.
- `deaths`: set deaths.
- `over`: set winners and sync.
- `terminated`: clear game and invalidate presence.
- `event`: append event message. Private events arrive on actor topic but bus does not expose topic, so rely on payload.
- `targets`: update actor possibleTargets if `actorId` matches.

## Subscriptions

Ensure active game subscribes to:

- `game/${gameId}` public channel.
- `game/${gameId}/actor/${actorId}` private channel after actor known.
- `game/${gameId}/chat/all` if chat store not already subscribing.

Check current app-level presence flow before duplicating subscriptions. `useRealtime.subscribe(topic)` is idempotent per full topic.

## Timer

In `GamePage.vue`, replace hard-coded duration:

```vue
<game-timer :duration="gameStore.phaseMeta?.duration ?? 0" />
```

If timer needs phase name, pass `gameStore.phaseMeta?.phase ?? gameStore.phase`.

## API Calls From UI

Use SDK methods from `api` boot export:

```ts
await api.submitVote({ target: playerNumber });
await api.submitVerdict({ verdict: 'guilty' });
await api.submitTargets({ targets });
```

Keep optimistic UI minimal. Realtime events should be source for shared vote/trial state.

## Acceptance

- Frontend accepts all backend game event payloads without parse warnings.
- Phase timer uses realtime duration.
- Votes update from realtime events.
- Trial state updates from realtime events.
- Actor/private updates refresh current actor.
- Game over stores winners and resyncs.
