# AGENTS.md

This repository uses TypeScript with SST for backend infrastructure and a Quasar
Vue 3 web app. Follow the conventions below when making changes.

## Quick map
- Root: SST config and workspace-level scripts.
- packages/core: shared domain logic, database access, and validation.
- packages/functions: Lambda/API handlers (Hono).
- packages/web/app: Quasar Vue 3 app, ESLint + Prettier.
- infra: SST infrastructure modules loaded by `sst.config.ts`.
- old: legacy code (avoid unless explicitly asked).
- node_modules is present; keep changes scoped to repo files only.

## Build, lint, test commands

### Workspace (root)
- Install: `bun install` (bun.lock is present).
- Dev (SST local): `bun run dev` (runs `sst dev`).
- Deploy (prod): `bun run deploy` (uses `sst deploy --stage prod`).
- Remove local stage: `bun run remove:local`.
- Remove prod stage: `bun run remove:prod`.
- AWS SSO login: `bun run auth` (profile `mafia-dev`).
- No root lint/test scripts are defined.

### Web app (Quasar)
- Dev: `bun --cwd packages/web/app run dev` (sst + quasar dev).
- Build: `bun --cwd packages/web/app run build`.
- Lint: `bun --cwd packages/web/app run lint`.
- Format: `bun --cwd packages/web/app run format`.
- Tests: `bun --cwd packages/web/app run test` (currently prints "No test specified").
- Single test: not configured; add a test runner before attempting per-test runs.
- Type-checking is handled by the Quasar/Vite tooling (no standalone script).

### Functions (Lambda)
- Format: `bun --cwd packages/functions run format`.
- No lint/test scripts defined.
- Single test: not configured; add a test runner before attempting per-test runs.
- Handlers are Hono-based; use `handle` from `hono/aws-lambda`.

### Core
- DB tooling: `bun --cwd packages/core run db` (drizzle-kit via `sst shell`).
- No lint/test scripts defined.
- Single test: not configured; add a test runner before attempting per-test runs.
- Drizzle migrations are ignored by Prettier (`packages/core/.prettierignore`).

### Testing notes
- Root has `vitest` installed but no configured scripts.
- There is no per-test runner configured anywhere in the repo.
- If you add a test tool, document how to run a single test here.

## Code style guidelines

### Language and modules
- TypeScript, ESM modules (`"type": "module"`).
- `tsconfig.json` enables `strict` mode and `verbatimModuleSyntax`.
- Keep files compatible with bundler module resolution.
- Avoid CommonJS patterns unless you are in build tooling config.

### Imports
- Prefer type-only imports where possible (`import type { ... }`).
- Web app ESLint enforces `@typescript-eslint/consistent-type-imports`.
- Order imports: external deps first, then internal workspace modules, then
  relative imports.
- Avoid unused imports; remove when no longer needed.
- When adding new dependencies, keep them workspace-scoped unless shared.

### Formatting
- Web app uses Prettier: single quotes, tabs, print width 100.
- Other packages are not auto-formatted consistently; follow existing file style
  and avoid sweeping reformatting.
- Semicolons are mixed; keep the existing convention in the file you touch.
- Keep line widths reasonable and match surrounding indentation.
- Root does not define a Prettier config; rely on the package-specific settings.

### Naming
- Variables and functions: `camelCase`.
- Types, classes, schemas, enums: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` only when truly constant values.
- Zod schemas typically end with `Schema` (ex: `LobbyInfoSchema`).
- Error codes use dot-separated strings (ex: `lobby.not_found`).
- Realtime event names follow dot-delimited namespaces (`lobby.terminated`).

### Types and validation
- Prefer Zod schemas for runtime validation in `packages/core`.
- Use `fn(...)` helper in `packages/core/src/util/fn.ts` for input parsing
  when extending core functionality.
- Use `isULID()` and `ULID` types from `packages/core/src/error.ts` for IDs.
- Avoid `any`; use `unknown` and narrow types when needed.
- For Hono routes, use `zValidator` from `packages/core/src/error.ts`.

### Error handling
- Backend uses `PublicError` and subclasses (`InputError`, `AuthError`,
  `ServerError`) from `packages/core/src/error.ts`.
- Prefer throwing `PublicError` subclasses for client-visible errors.
- Lambda API handlers (`packages/functions/src/api/index.ts`) format
  error responses; keep those patterns intact.
- Log unexpected errors with context before returning a 500 response.
- Preserve error `code` values because clients depend on them.

### Database and transactions (core)
- Use `createTransaction`/`useTransaction` helpers from
  `packages/core/src/db/transaction.ts`.
- Prefer `afterTx` for side effects that should happen after commits.
- Use Drizzle ORM patterns (`eq`, `inArray`, `.returning()`).
- Keep SQL table definitions in `packages/core/src/*/*.sql.ts`.

### API patterns (functions)
- Hono-based routes in `packages/functions/src/api/*`.
- `authorize` middleware handles auth; add new routes to `api/index.ts`.
- Use shared schemas/errors from `@mafia/core`.
- Prefer returning `c.json(...)` with explicit status codes.
- Use `Resource.App.stage` from `sst` for stage-specific behavior.

### Frontend (web app)
- Vue 3 + Quasar. Prefer Composition API style.
- ESLint + Prettier in `packages/web/app` define lint and format rules.
- Keep component names readable; `vue/multi-word-component-names` is disabled.
- No tests configured yet.
- Use `defineStore` for Pinia and prefer typed store state.

### Infrastructure (SST)
- Config lives in `sst.config.ts`.
- Prod stages use `retain` + `protect`; non-prod stages remove by default.
- AWS profiles are stage-specific (`mafia-prod`/`mafia-dev`).
- Infra modules are loaded from `infra/` and can return outputs.

### Realtime
- Realtime events are defined in `packages/core/src/realtime.ts`.
- Publish after commits via `afterTx` to avoid emitting on failed transactions.

## Repository-specific rules
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No GitHub Copilot instructions found in `.github/copilot-instructions.md`.

## When adding new tooling
- Add workspace scripts at the root if multiple packages should use them.
- Document new test or lint commands in this file.
- Keep tooling consistent with bun, SST, and the Quasar app.
- Update `packages/web/app/eslint.config.js` if ESLint rules change.

## Practical tips for agents
- Avoid editing `old/` unless asked.
- Minimize formatting-only diffs.
- Prefer local functions/helpers over duplicating logic.
- Add new errors to `packages/core/src/error.ts` if they should be public.
- Update schema types alongside any data shape changes.
- When touching infra, keep SST stage behavior intact (`prod` uses retain).
- Keep infra modules in `infra/` small and return outputs when needed.
- Use `packages/core` exports instead of duplicating shared logic.
