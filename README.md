# Mafia

Mafia is a full-stack TypeScript project for running a Mafia game online. It ships
with an SST-backed API, a Quasar Vue 3 web app, and a pure game engine.

## Players and viewers

This repository contains the source code for the game and engine. If you want to
run it locally, see the contributing notes below.

## Project structure

- `packages/core` shared domain logic, validation, and database access
- `packages/functions` Lambda/API handlers (Hono)
- `packages/engine` pure game simulation module
- `packages/web/app` Quasar Vue 3 web app
- `infra` SST infrastructure modules loaded by `sst.config.ts`

## Contributing

- Requires Bun and AWS credentials for SST (SSO profile `mafia-dev` by default).
- Install dependencies: `bun install`.
- Run locally: `bun run dev`.
- Engine details and examples: `packages/engine/README.md`.

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

You are free to:

- View and study the source code
- Fork and modify the project
- Contribute improvements

If you deploy a modified version of this game publicly or offer it as a service,
you must also make your source code available under the same license.
