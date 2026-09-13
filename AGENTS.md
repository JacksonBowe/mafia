# AGENTS.md

Load `caveman`; use ultra mode unless clarity or safety requires normal prose.
Prefer Quasar components and Quasar utility classes over custom CSS.

TypeScript monorepo using SST (AWS), Hono (API), Drizzle (DB), and Quasar/Vue 3 (frontend).

Directory-local `.agent_context.md` files are brief routing aids for agents. They should summarize what exists in their own directory so an agent can orient quickly without opening every file.

When modifying a directory, update the relevant `.agent_context.md` file if the directory map is no longer accurate or is missing important new entries.

The user will perform all DB actions themselves (migration generation and application).

## Repository structure

| Path                 | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `packages/core`      | Shared domain logic, DB access, validation  |
| `packages/functions` | Lambda/API handlers (Hono)                  |
| `packages/engine`    | Game engine logic with tests                |
| `packages/web/app`   | Quasar Vue 3 frontend                       |
| `packages/bots`      | Game bots                                   |
| `packages/sdk`       | Client SDK                                  |
| `packages/scripts`   | Operational scripts                         |
| `infra/`             | SST infrastructure modules                  |
| `old/`               | Legacy code (avoid unless explicitly asked) |

## Commands

### Installation and development

```bash
bun install                    # Install all dependencies
bun run dev                    # Start SST local dev
bun run auth                   # AWS SSO login (mafia-dev profile)
```

### Linting, formatting, and testing

```bash
bun run lint                   # Lint all packages
bun run format                 # Format all packages
bun run test                   # Run all tests (vitest)
bun run test:watch             # Watch mode

# Single test file
bun vitest run --config vitest.config.mts packages/engine/tests/engine.test.ts

# Single test by name
bun vitest run --config vitest.config.mts -t "test name pattern"
```

## Agent guidelines

1. Avoid `old/` unless explicitly asked.
2. Minimize formatting-only diffs; match existing file style.
3. Use `@mafia/core` exports instead of duplicating logic.
4. Add new errors to `packages/core/src/error.ts`. Error codes are stable and dot-separated.
5. Update schemas alongside data shape changes. SQL tables go in `packages/core/src/*/*.sql.ts`.
6. Validate API input with `zValidator`.
7. Publish realtime events (dot-delimited names) via `afterTx` to avoid emitting on rollback.
8. Do not implement backwards-compatibility safeguards. Never export old names as wrappers or aliases.

## Skills

Load the relevant skill before work in these areas:

- `api-change`: HTTP endpoints, API shapes, API errors, or realtime events.
- `db-schema-change`: Drizzle tables, relations, persisted data shapes, or schema migrations. Do not generate or apply migrations.
- `engine-test`: game rules, phases, roles, actions, win conditions, or engine bugs.
- `github-issue`: creating, filing, or refining GitHub issues.
- `sst-infra`: AWS resources, SST bindings, IAM, queues, schedules, or deployment configuration.
- `quasar`: Quasar/Vue frontend work.
