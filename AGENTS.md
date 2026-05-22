# AGENTS.md

Keep OpenCode replies concise. Use ultra caveman mode.
Prefer Quasar components and Quasar utility classes over custom CSS.

TypeScript monorepo using SST (AWS), Hono (API), Drizzle (DB), and Quasar/Vue 3 (frontend).

Directory-local `.agent_context.md` files are brief routing aids for agents. They should summarize what exists in their own directory so an agent can orient quickly without opening every file.

When modifying a directory, update the relevant `.agent_context.md` file if the directory map is no longer accurate or is missing important new entries.

The user will perform all DB actions themselves.

## Repository structure

| Path                 | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `packages/core`      | Shared domain logic, DB access, validation  |
| `packages/functions` | Lambda/API handlers (Hono)                  |
| `packages/engine`    | Game engine logic with tests                |
| `packages/web/app`   | Quasar Vue 3 frontend                       |
| `infra/`             | SST infrastructure modules                  |
| `old/`               | Legacy code (avoid unless explicitly asked) |

## Commands

### Installation and development

```bash
bun install                    # Install all dependencies
bun run dev                    # Start SST local dev
bun run auth                   # AWS SSO login (mafia-dev profile)
```

### Linting and formatting

```bash
bun run lint                   # Lint all packages
bun run format                 # Format all packages
bun --cwd packages/core run lint
bun --cwd packages/functions run lint
bun --cwd packages/web/app run lint
```

### Testing

```bash
bun run test                   # Run all tests (vitest)
bun run test:watch             # Watch mode

# Single test file
bun vitest run --config vitest.config.mts packages/engine/tests/engine.test.ts

# Single test by name
bun vitest run --config vitest.config.mts -t "test name pattern"
```

## Code style

### TypeScript

- Strict mode enabled, ESM modules (`"type": "module"`)
- `verbatimModuleSyntax` is on; use explicit type imports
- Avoid `any`; prefer `unknown` with type narrowing
- Prefix unused variables with underscore: `_unusedVar`

### Imports

```typescript
// Use type-only imports (enforced by ESLint)
import type { SomeType } from './module';
import { someFunction } from './module';

// Order: external deps > workspace modules > relative imports
import { z } from 'zod';
import { User } from '@mafia/core/user';
import { helper } from './utils';
```

### Formatting (Prettier)

- Tabs for indentation
- Single quotes
- Print width: 100
- Trailing commas
- Semicolons required

### Naming conventions

| Type                    | Convention       | Example            |
| ----------------------- | ---------------- | ------------------ |
| Variables, functions    | camelCase        | `getUserById`      |
| Types, classes, schemas | PascalCase       | `LobbyInfoSchema`  |
| Constants               | UPPER_SNAKE_CASE | `MAX_PLAYERS`      |
| Error codes             | dot.separated    | `lobby.not_found`  |
| Realtime events         | dot.delimited    | `lobby.terminated` |

## Patterns

### Validation (Zod)

```typescript
import { z } from 'zod';
import { isULID } from '@mafia/core/error';

const MySchema = z.object({
	id: isULID(),
	name: z.string().min(1),
});
```

### Error handling

```typescript
import { PublicError, InputError, AuthError, ServerError } from '@mafia/core/error';

// Throw for client-visible errors
throw new InputError('validation_error', 'Invalid input', details);
throw new AuthError('unauthorized', 'Not authenticated');

// Error codes are stable; clients depend on them
```

### Database transactions

```typescript
import { createTransaction, useTransaction, afterTx } from '@mafia/core/db/transaction';

await createTransaction(async (tx) => {
	const result = await tx.insert(users).values(data).returning();

	// Side effects after commit
	afterTx(() => sendNotification(result.id));

	return result;
});
```

### API routes (Hono)

```typescript
import { Hono } from 'hono';
import { zValidator } from '@mafia/core/error';

const routes = new Hono().post('/create', zValidator('json', CreateSchema), async (c) => {
	const input = c.req.valid('json');
	const result = await doSomething(input);
	return c.json(result, 201);
});
```

### Realtime events

```typescript
import { realtime, defineRealtimeEvent } from '@mafia/core/realtime';
import { afterTx } from '@mafia/core/db/transaction';

// Publish after transaction commits
afterTx(() => realtime.publish(resource, MyEvent, payload));
```

### Frontend (Vue 3 + Quasar)

- Use Composition API with `<script setup lang="ts">`
- State management via Pinia (`defineStore`)
- Multi-word component names rule is disabled

## Agent guidelines

1. **Avoid `old/`** unless explicitly asked
2. **Minimize formatting-only diffs**; match existing file style
3. **Use `@mafia/core` exports** instead of duplicating logic
4. **Add new errors to `packages/core/src/error.ts`**
5. **Update schemas alongside data shape changes**
6. **SQL tables go in `packages/core/src/*/*.sql.ts`**
7. **Keep infra modules small**; return outputs when needed
8. **Publish realtime events via `afterTx`** to avoid emitting on rollback
9. Do not implement any backwards compatability safeguards. NEVER export old names as wrappers or attempt to use aliases
