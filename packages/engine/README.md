# Engine

## Purpose
The engine is a pure, stateless simulation module for Mafia game logic. Each invocation takes
inputs, resolves state, and returns a fully serializable output payload (including logs).

## API (pseudocode)
```
newGame({ players, config, options }) -> { state, actors, events, winners, log }
loadGame({ players, config, state, options }) -> { state, actors, events, winners, log }
resolveGame({ players, config, state, options }) -> { state, actors, events, winners, log }
```

- `players` are input payloads (ids, names, aliases, targets, roleActions).
- `state` is the last known `GameState` when loading/resolving.
- `options.seed` makes the RNG deterministic.

## Technical implementation
- Zod validates all inputs at the API boundary.
- `src/game.ts` hosts core orchestration and the resolution loop.
- `src/roles/*` defines role behavior.
- `src/events.ts` provides event grouping, and `src/logger.ts` captures per-invocation logs.
- All outputs are serializable and intended for persistence by the caller.

## Roles and targeting
Roles expose two key behaviors:

```
findPossibleTargets(actors) -> possibleTargets
action() -> emits events and mutates actor state
```

Targeting is explicit and ordered:
- `possibleTargets` is a list of lists. Each inner list represents valid choices for a target slot.
- `targets` is an ordered list of chosen targets aligned to those slots.
- `resolveGame` validates each target against `possibleTargets` and clears invalid targets.

Turn order is defined by `ROLE_LIST` in `src/roles/index.ts`.

## Examples
See `packages/engine/examples/README.md` for runnable examples.
