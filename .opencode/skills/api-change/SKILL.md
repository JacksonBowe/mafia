---
name: API change
description: Safely change Mafia Hono APIs using validation, core domain logic, stable errors, schema updates, and transactional realtime events.
---

Use for adding or changing HTTP endpoints, API request/response shapes, API errors, or related realtime events.

## Workflow

1. Inspect the nearest existing route and its core-layer implementation before editing.
2. Validate every API input with `zValidator`.
3. Keep shared domain logic, database access, and validation in `@mafia/core`; do not duplicate it in `packages/functions`.
4. Add stable, dot-separated error codes to `packages/core/src/error.ts` when new domain errors are needed.
5. Update schemas alongside any data-shape change, including SQL definitions in `packages/core/src/*/*.sql.ts` where applicable.
6. Emit realtime events only through `afterTx`, so no event is published for a rolled-back transaction. Use dot-delimited event names.
7. Update or add focused tests for validation, success behavior, errors, and emitted events as applicable.
8. Run the smallest relevant test command, then report any broader test not run.

Do not add backwards-compatibility aliases or old-name wrappers unless explicitly requested.
