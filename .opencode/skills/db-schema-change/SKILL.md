---
name: Database schema change
description: Change Mafia Drizzle data shapes completely while leaving migration generation and application to the user.
---

Use for adding or changing tables, columns, enums, relations, indexes, constraints, or persisted domain shapes.

## Workflow

1. Inspect the current Drizzle SQL definition under `packages/core/src/*/*.sql.ts` and all callers of the affected shape.
2. Define the intended nullability, default, foreign-key, uniqueness, index, and deletion behavior before editing.
3. Update the SQL schema, related domain types, Zod validation, queries, API contracts, and tests together.
4. Check existing data assumptions and identify any required backfill or migration ordering in the final report.
5. Preserve transactional behavior; publish related realtime events with `afterTx` only.
6. Run type checks or focused tests that do not require generating or applying a database migration.

## Boundary

The user performs all database actions. Do not generate, apply, or run migrations. State the schema changes and what migration the user should create instead.
