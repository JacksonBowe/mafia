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

## Build, lint, test commands

### Workspace (root)
- Install: `bun install` (bun.lock is present).
- Dev (SST local): `bun run dev` (runs `sst dev`).
- Deploy (prod): `bun run deploy` (uses `sst deploy --stage prod`).
- Remove local stage: `bun run remove:local`.
- Remove prod stage: `bun run remove:prod`.
- AWS SSO login: `bun run auth` (profile `mafia-dev`).

### Web app (Quasar)
- Dev: `bun --cwd packages/web/app run dev` (sst + quasar dev).
- Build: `bun --cwd packages/web/app run build`.
- Lint: `bun --cwd packages/web/app run lint`.
- Format: `bun --cwd packages/web/app run format`.
- Tests: `bun --cwd packages/web/app run test` (currently prints "No test specified").
- Single test: not configured; add a test runner before attempting per-test runs.

### Functions (Lambda)
- Format: `bun --cwd packages/functions run format`.
- No lint/test scripts defined.
- Single test: not configured; add a test runner before attempting per-test runs.

### Core
- DB tooling: `bun --cwd packages/core run db` (drizzle-kit via `sst shell`).
- No lint/test scripts defined.
- Single test: not configured; add a test runner before attempting per-test runs.

## Code style guidelines

### Language and modules
- TypeScript, ESM modules (`"type": "module"`).
- `tsconfig.json` enables `strict` mode and `verbatimModuleSyntax`.
- Keep files compatible with bundler module resolution.

### Imports
- Prefer type-only imports where possible (`import type { ... }`).
- Web app ESLint enforces `@typescript-eslint/consistent-type-imports`.
- Order imports: external deps first, then internal workspace modules, then
  relative imports.
- Avoid unused imports; remove when no longer needed.

### Formatting
- Web app uses Prettier: single quotes, tabs, print width 100.
- Other packages are not auto-formatted consistently; follow existing file style
  and avoid sweeping reformatting.
- Semicolons are mixed; keep the existing convention in the file you touch.
- Keep line widths reasonable and match surrounding indentation.

### Naming
- Variables and functions: `camelCase`.
- Types, classes, schemas, enums: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` only when truly constant values.
- Zod schemas typically end with `Schema` (ex: `LobbyInfoSchema`).
- Error codes use dot-separated strings (ex: `lobby.not_found`).

### Types and validation
- Prefer Zod schemas for runtime validation in `packages/core`.
- Use `fn(...)` helper in `packages/core/src/util/fn.ts` for input parsing
  when extending core functionality.
- Use `isULID()` and `ULID` types from `packages/core/src/error.ts` for IDs.
- Avoid `any`; use `unknown` and narrow types when needed.

### Error handling
- Backend uses `PublicError` and subclasses (`InputError`, `AuthError`,
  `ServerError`) from `packages/core/src/error.ts`.
- Prefer throwing `PublicError` subclasses for client-visible errors.
- Lambda API handlers (`packages/functions/src/api/index.ts`) format
  error responses; keep those patterns intact.
- Log unexpected errors with context before returning a 500 response.

### Database and transactions (core)
- Use `createTransaction`/`useTransaction` helpers from
  `packages/core/src/db/transaction.ts`.
- Prefer `afterTx` for side effects that should happen after commits.
- Use Drizzle ORM patterns (`eq`, `inArray`, `.returning()`).

### API patterns (functions)
- Hono-based routes in `packages/functions/src/api/*`.
- `authorize` middleware handles auth; add new routes to `api/index.ts`.
- Use shared schemas/errors from `@mafia/core`.

### Frontend (web app)
- Vue 3 + Quasar. Prefer Composition API style.
- ESLint + Prettier in `packages/web/app` define lint and format rules.
- Keep component names readable; `vue/multi-word-component-names` is disabled.
- No tests configured yet.

## Repository-specific rules
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No GitHub Copilot instructions found in `.github/copilot-instructions.md`.

## When adding new tooling
- Add workspace scripts at the root if multiple packages should use them.
- Document new test or lint commands in this file.
- Keep tooling consistent with bun, SST, and the Quasar app.

## Practical tips for agents
- Avoid editing `old/` unless asked.
- Minimize formatting-only diffs.
- Prefer local functions/helpers over duplicating logic.
- Add new errors to `packages/core/src/error.ts` if they should be public.
- Update schema types alongside any data shape changes.
