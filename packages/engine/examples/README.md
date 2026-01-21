# Engine examples

## Running the examples

From the repo root:

```
bun --cwd packages/engine run examples/new
bun --cwd packages/engine run examples/load
bun --cwd packages/engine run examples/resolve
bun --cwd packages/engine run examples/resolve-win
```

From the package directory:

```
bun run examples/new
bun run examples/load
bun run examples/resolve
bun run examples/resolve-win
```

## What each example does

- `examples/new`: creates a new game and prints actors/state/events/log.
- `examples/load`: loads a game from an existing state and prints actors/state/events/log.
- `examples/resolve`: resolves one day of actions from a newly created game.
- `examples/resolve-win`: resolves a deterministic town win scenario.
