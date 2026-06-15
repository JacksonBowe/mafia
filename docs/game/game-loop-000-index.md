# Game Loop Implementation Index

This series breaks the game loop port into stages. It assumes current repo shape:

- `infra/gameloop.ts` exists but is commented sketch code.
- `packages/functions/src/api/game.ts` only exposes `GET /game`.
- `packages/core/src/game/index.ts` has game CRUD plus vote/verdict helpers.
- `packages/core/src/game/game.sql.ts` has `game` and `game_player` tables, but no persisted engine events field.
- `packages/core/src/game/schema.ts` defines phases in lowercase: `pregame`, `morning`, `day`, `poll`, `defense`, `trial`, `lynch`, `evening`, `night`.
- `packages/engine` already exposes `newGame`, `loadGame`, `resolveGame`, `Game.lynch`, and engine event dumps.
- `packages/web/app/src/stores/game.ts` stores sync data and basic phase metadata.
- `packages/web/app/src/lib/game/events.ts` handles only `realtime.game.phase`, `realtime.game.state`, `realtime.game.over`, and `realtime.game.terminated`.

Implement in this order:

1. `game-loop-001-domain-and-persistence.md`
2. `game-loop-002-infra-step-functions.md`
3. `game-loop-003-loop-service.md`
4. `game-loop-004-api-and-sdk.md`
5. `game-loop-005-frontend-events.md`
6. `game-loop-006-verification.md`

Use `docs/game/old-attempt/gameloop-structure.md` as behavior reference, not as code style reference.

Core invariant: Step Functions only wait, invoke, and branch. Game correctness lives in one idempotent phase-advance service.
