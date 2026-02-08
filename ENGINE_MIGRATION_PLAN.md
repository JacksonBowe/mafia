# Engine Migration Plan (Python -> TypeScript)

## Goals
- Port `old/packages/engine` to TypeScript as a pure-function engine module.
- Keep the engine stateless per invocation and return all data needed to persist.
- Collect per-invocation logs in memory and return them to the caller.

## Target Location
- `packages/engine/src`

## Public API (Pure Functions)
- `newGame(input)`
- `loadGame(input)`
- `resolveGame(input)`

Each call returns a fully serializable result:

```
{
  state,
  actors,
  events,
  winners,
  log
}
```

## Input Shape
```
{
  players: PlayerInput[]
  config: GameConfigInput
  state?: GameStateInput
  options?: { seed?: number }
}
```

## Module Layout
- `index.ts` (public API + exports)
- `types.ts` (Zod schemas + public types)
- `events.ts` (GameEvent, GameEventGroup, Duration)
- `logger.ts` (per-invocation log collector)
- `roles/*` (Actor, Town, Mafia, Citizen, Doctor, Bodyguard, Mafioso, Godfather)
- `game.ts` (engine logic; uses classes internally, returns serialized results)
- `utils.ts` (role registry + RNG helpers)

## Validation + Errors
- Use Zod schemas for validation in all public APIs.
- On invalid input, throw `InputError` from `packages/core/src/error.ts`.
- Error code: `engine.validation_error`.

## Deterministic Randomness
- Implement a seedable RNG with `options.seed`.
- Default to `Math.random()` when no seed is provided.

## Logging
- `EngineLogger` collects log lines in memory.
- All public calls return `log` as an array of lines.
- No filesystem I/O.

## Parity Targets
- Role assignment and turn order match the Python implementation.
- Resolution flow and event emission match the Python behavior.
- Winners computed identically to Python tests.

## Minimal Verification
- Provide a small TS test or example usage to validate:
  - New game role assignment
  - Resolve with no winner
  - Resolve with town winner
  - Lynch updates state and graveyard
