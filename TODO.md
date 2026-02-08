# Project TODO (Long-term)

Legend:

- [x] Complete
- [~] In progress / partially complete
- [ ] Not started

## Lobby flow and game start

- [x] Core lobby data model and DB tables exist (lobby + lobby members in core).
- [x] Lobby API endpoints for create/list/get/join/leave are implemented.
- [x] Lobby UI exists (lobby card, finder, presence binding, realtime subscribe).
- [x] Implement lobby start game endpoint (host-only, minimum players).
- [x] Add game table/schema in core (`game` + `game_player` tables).
- [x] Game creation from engine output with player records.
- [x] Lobby deleted on game start (no lobby -> game linkage).
- [x] Add `lobby.started` realtime event (lobbyId, gameId payload).
- [x] Add `GET /game/:gameId` and `GET /game/me/active` API endpoints.
- [~] Map lobby config to game config (currently uses default config builder).

## Game layout + page UI

- [ ] Add game route/page and routing guard for active game sessions.
- [ ] Create a deliberate game layout shell (header, phase/timer, player list, action rail).
- [ ] Add Pinia store for game session state (phase, roster, player role, timers).
- [ ] Build base UI scaffolding for day/night phases (container + placeholder panels).
- [ ] Add state bootstrap from API (game id, lobby id, player identity).
- [ ] Wire realtime subscriptions for game topics (phase updates, actions, chat).

## Player actions (vote, target, chat)

- [ ] Define core action schemas (vote, target, role actions) with validation.
- [ ] Add action submission endpoints (phase-aware, role-aware validation).
- [ ] Implement vote UI (target list, submit, update, show tallies).
- [ ] Implement night target UI (role-specific action selection).
- [ ] Add game chat UI (global + team + private channels).
- [ ] Publish action results to realtime events after commit.
- [~] Menu chat is wired; extend the existing realtime chat plan to game channels.

## Backend game loop (phases + resolution)

- [ ] Define game state model in core (phases, timers, history snapshots).
- [ ] Add persistence helpers and transaction-safe updates for game state.
- [ ] Implement phase transitions (day -> vote -> resolution -> night -> resolution).
- [ ] Action aggregation and validation (lock actions at phase end).
- [ ] Resolution rules (vote tally, eliminations, victory check).
- [ ] Deterministic ordering for night actions (role priority).
- [ ] Publish realtime events after commits (phase changes, eliminations, logs).
- [ ] Add admin/host controls (force advance, pause, cancel).

## Engine integration

- [x] Engine module exists in `packages/engine` with `newGame/loadGame/resolveGame` API.
- [x] Engine invoked on lobby start to generate initial game state.
- [x] Engine output (state, actors, config) persisted to game table.
- [ ] Invoke engine on phase boundaries (resolveGame) and persist resulting state.
- [ ] Map engine events to realtime payloads and UI-friendly summaries.
- [ ] Add integration tests or scripted examples for engine + backend flow.

## Cross-cutting improvements

- [x] Add error codes for game lifecycle (`game.not_found`, `game.invalid_state`).
- [ ] Document API contracts for lobby/game endpoints (request/response examples).
- [ ] Keep shared schemas exported from core and reused in functions + web.
- [ ] Update roadmap docs when engine or realtime plans change.
