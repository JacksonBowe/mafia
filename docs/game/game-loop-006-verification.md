# Stage 6: Verification

Goal: verify loop behavior without depending on AWS where possible, then verify deployed workflow lightly.

## Unit Tests

Prefer tests around pure/domain logic before Lambda/infra.

Existing command examples:

```bash
bun run test
bun vitest run --config vitest.config.mts -t "test name pattern"
```

Add tests near package conventions. If no core test folder exists, follow existing package test layout.

## Domain Test Cases

### Vote Tally

Use `Game.tallyVotes` or extracted tally helper.

Cases:

- No votes returns no winner.
- Vote count not over half alive returns no winner.
- Vote count over half alive returns target.
- Dead players do not count.
- Self-vote rejected by API/domain.

### Verdict Tally

Cases:

- Guilty > innocent returns guilty.
- Tie returns innocent.
- Innocent > guilty returns innocent.
- On-trial player does not count.
- Dead players do not count.

### Phase Transitions

Test `advanceLoop` with seeded game records if test DB exists. If no DB test harness, extract `decideNextPhase` pure function and test that first.

Cases:

- `pregame` -> `evening`.
- `day` -> `poll`.
- `poll` no majority and poll count <= 2 -> `poll`.
- `poll` no majority and poll count > 2 -> `evening` with poll count reset.
- `poll` majority -> `defense` and on-trial set.
- `defense` -> `trial`.
- `trial` guilty -> `lynch`.
- `trial` innocent with low poll count -> `poll`.
- `trial` innocent with high poll count -> `evening`.
- `lynch` -> `poll` or `evening` depending poll count.
- `morning` with winners -> `continue: false`, status completed.

### Event Persistence

Cases:

- `evening` stores engine events and moves `night`.
- `night` publishes stored events, clears `game_player.targets`, clears events, moves `morning`.

### Player Input Boundary

Cases:

- `POST /game/targets` updates only `game_player.targets`.
- `POST /game/targets` does not mutate `game.actors`.
- `evening` patches `game_player.targets` into engine actor input before `resolveGame`.
- Engine output from `resolveGame` replaces `game.actors` after resolution.
- `night` clears `game_player.targets` without clearing engine-derived actor fields such as `possibleTargets` or `allies`.

## Lambda Contract Tests

Test `packages/functions/src/gameloop/advance.handler` with invalid and valid payloads:

- Invalid ULID returns Zod error or handler rejection.
- Missing game returns `{ continue: false }` or controlled domain error based implementation.
- Completed game returns `{ continue: false, waitSeconds: 0 }`.

## Manual Local Checks

Run package lint after each stage:

```bash
bun --cwd packages/core run lint
bun --cwd packages/functions run lint
bun --cwd packages/web/app run lint
```

Run full checks before handoff:

```bash
bun run lint
bun run test
```

## AWS/SST Smoke Test

After infra deploy/dev is available:

1. Start `bun run dev`.
2. Create lobby.
3. Join enough players or use admin/dummy game route if available.
4. Start lobby.
5. Confirm one Step Function execution named `gameId` starts.
6. Confirm execution input is `{ gameId }`.
7. Confirm execution loops through phases.
8. Confirm duplicate lobby-start retry does not create second active execution.
9. Watch realtime client logs for parse errors.

## Observability

Add compact logs in loop Lambda:

```ts
console.log('advanceLoop', { gameId, phase: game.phase, pollCount: game.pollCount });
console.log('advanceLoop.result', { gameId, nextPhase, continue: cont, waitSeconds });
```

Do not log full engine state, actor private data, or role assignments in production logs.

## Known Risks

- `night` event replay loses per-group timing if Lambda does not sleep. Accept for first port; phase duration still gives frontend animation budget.
- `events` recursive schema may be loose initially. Accept if engine remains only writer.
- Concurrent user input during phase transition can race. Mitigate with transaction boundaries and phase checks.
- `lynch` win is checked only in `morning` by design. This preserves old behavior even if game is technically decided earlier.

## Done Definition

- Game can start from lobby and Step Function begins.
- Phases advance without manual intervention.
- Votes and verdicts affect poll/trial outcomes.
- Night targets are consumed by engine resolution.
- Deaths and game over publish to clients.
- State machine stops when `morning` finds winners.
- Tests/lint pass or failures are documented with exact commands and errors.
