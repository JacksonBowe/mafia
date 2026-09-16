# Scripts

Run scripts through their package commands; each uses `sst shell` to inject SST resource bindings.

## Query game logs

Fetch one game's server-only diagnostic records directly from the database:

```bash
bun --cwd packages/scripts run query-game-logs -- --game-id <gameId>
bun --cwd packages/scripts run query-game-logs -- --game-id <gameId> --kind engine
bun --cwd packages/scripts run query-game-logs -- --game-id <gameId> --kind audit
bun --cwd packages/scripts run query-game-logs -- --recent 5
```

`--kind` accepts `all` (default), `engine`, or `audit`. Output is pretty JSON on stdout; progress and errors use stderr.

## List recent games

```bash
bun --cwd packages/scripts run list-games
bun --cwd packages/scripts run list-games -- --limit 25
bun --cwd packages/scripts run list-games -- --status completed --order asc
```

Includes active, completed, and cancelled games by default. `--status` filters lifecycle state; `--cursor` accepts prior output's `meta.nextCursor`. Use a returned ID with `query-game-logs`, or use `--recent` to retrieve logs for recent games directly.
