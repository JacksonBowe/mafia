---
name: Engine test
description: Test Mafia game-engine behavior with deterministic fixtures, state assertions, and focused Vitest execution.
---

Use for changing or debugging game rules, phases, roles, actions, win conditions, engine events, or engine state transitions.

## Workflow

1. Inspect the closest existing test in `packages/engine/tests` and shared helpers such as `packages/engine/src/testing.ts`.
2. Make inputs deterministic. Do not rely on real time, uncontrolled randomness, or test ordering.
3. Test the externally meaningful result: resulting game state, allowed or rejected transition, errors, and emitted events where relevant.
4. Cover the normal path plus meaningful boundaries and invalid transitions.
5. Keep role-specific cases in the matching role test area when one exists.
6. Run the narrowest relevant test first:

```sh
bun vitest run --config vitest.config.mts packages/engine/tests/<file>.test.ts
```

7. Report the exact tests run and any related cases that remain untested.

Avoid implementation-only assertions when behavior can be asserted directly.
