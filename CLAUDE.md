# CLAUDE.md

Working notes for Claude Code (and other automated contributors) on this repository.
Human-facing overview is in [`README.md`](README.md).

**Documentation map:**

- [`doc/architecture.md`](doc/architecture.md) — how the codebase fits together
- [`doc/game-rules.md`](doc/game-rules.md) — physics, trail, collision, scoring, bonuses, constants
- [`doc/protocol.md`](doc/protocol.md) — the WebSocket event reference
- [`doc/flows.md`](doc/flows.md) — sequence diagrams for the main flows
- [`doc/modernization-roadmap.md`](doc/modernization-roadmap.md) — phased plan + decisions
- [`doc/rewrite-plan.md`](doc/rewrite-plan.md) — the AngularJS → Svelte + Vite playbook
- [`doc/deployment.md`](doc/deployment.md) — target Docker image + `docker compose` + CI build
- [`doc/adr/`](doc/adr) — ADR 0001 (Svelte), ADR 0002 (`ws` transport)

## What this is

Curvytron — a server-authoritative real-time multiplayer "curve" game. Node.js server
(Express + raw WebSocket), browser client (AngularJS 1.4 + `<canvas>`). Fork of
`Elao/curvytron`, frozen on 2015-era tooling. We modernize **incrementally, keeping the
game playable at every step**.

## Build & run

Tasks are in [`gulpfile.js`](gulpfile.js); bundle contents in [`recipes/`](recipes).

| Command | Effect |
| --- | --- |
| `gulp` / `gulp default` | Production build → `web/js/curvytron.js` (+ `dependencies.js`), `web/css/style.css`, `web/index.html`, `bin/curvytron.js` |
| `gulp dev` | Unminified build + `stressTest.js` |
| `gulp watch` | `dev` + rebuild on `src/**` changes |
| `gulp jshint` | Lint `src/**/*.js` |
| `node bin/curvytron.js` | Start the built server (default port 8080) |

- **All build outputs are git-ignored** (`web/js/`, `web/css/`, `web/index.html`, `bin/`,
  `stats/`). Never commit them. Rebuild after pulling.
- The legacy toolchain (`gulp@3`, `gulp-sass@0.7`) **requires an old Node (~8–10)**.
  `npm install` also auto-runs `bower install` (a `scripts.install` hook). Do not assume
  `npm install` works on a modern machine — flag it instead.
- `config.json` (git-ignored) is optional; `src/server/launcher.js` falls back to
  `{ port: 8080, inspector: { enabled: false } }`.

## Architecture rules you must know before editing

1. **No module system in `src/`.** The build concatenates files (globs in
   `recipes/client.json` / `recipes/server.json`) and wraps everything in a single
   `(function(){ "use strict"; ... })()`. Consequences:
   - Every top-level `function Foo(){}` / `var Foo = ...` is a **global** within the
     bundle. No `import` / `export` / `require` in `src/` (server's real `require`s are
     confined to `src/server/dependencies.js`).
   - A new file placed under `src/client|server|shared/**` is picked up automatically by
     the recipe globs. Load **order** is glob order — if `A` references `B` at module
     top-level (not inside a method), `B`'s file must sort earlier. Prefer referencing
     other classes only from inside constructors/methods to sidestep ordering.
2. **Shared base classes.** `src/shared/model/BaseX.js` defines a pseudo-class that
   **both** `src/client/model/X.js` and `src/server/model/X.js` extend via
   `X.prototype = Object.create(BaseX.prototype)`. Editing a `Base*` file changes client
   **and** server behavior — check both subclasses.
3. **Pseudo-class pattern** (match it in new code):
   ```js
   function Thing(arg) {
       BaseThing.call(this, arg);
       this.onTick = this.onTick.bind(this); // bind callbacks in the constructor
   }
   Thing.prototype = Object.create(BaseThing.prototype);
   Thing.prototype.constructor = Thing;
   Thing.prototype.doStuff = function () { /* ... */ };
   ```
   Events use `EventEmitter` (`src/shared` classes call `EventEmitter.call(this)`).
4. **Wire protocol** = `src/shared/core/BaseSocketClient.js`. Outgoing events are batched
   into `JSON.stringify([[name, data, callbackId?], ...])` and flushed on an interval
   (`client.addEvent(name, data, cb)` / `addEvents([...])`, `force` bypasses batching).
   Incoming array entries with a **numeric** first element are callback replies. This is
   **not** Socket.IO — do not introduce `socket.io` without a protocol migration plan.
5. **Game loop is fixed-timestep via `setTimeout`** (`BaseGame.framerate = 1000/60`,
   `BaseGame.loop`). The server runs the authoritative simulation; the client runs its
   own loop for rendering/prediction. Not `requestAnimationFrame` on the server (obviously)
   and the client loop is in `src/client/model/Game.js` / `src/client/core`.
6. **Server collision** uses a spatial grid: `World` holds a grid of `Island`s
   (`islandGridSize = 40`); avatar trail points become `AvatarBody` entries added to the
   islands they overlap; `World.getBody(body)` / `getBoundIntersect(...)` do the lookups
   in `src/server/model/Game.js#update`.

## Conventions / constraints

- Lint config: [`.jshintrc`](.jshintrc) — `es3: true`, `quotmark: 'single'`,
  4-space indent, `camelcase`, `eqeqeq`, `curly`, `latedef`. Keep `gulp jshint` green.
- `.editorconfig` mirrors these (4-space, LF, UTF-8, final newline).
- Style/comments: terse `/** ... */` headers on every function, matching existing files.
- Keep changes minimal and reversible; the golden rule is **the game must still start and
  be playable** after any change.

## Modernization direction (decided)

- Client shell: rewrite AngularJS → **Svelte 5 + TS + Vite**, strangler-style, one screen
  per PR, on the `modernize` branch. `src/shared/**` + `src/client/core|model|animation`
  are reused (converted to ESM/TS), **not** rewritten; the canvas stays out of Svelte's
  render cycle. See [`doc/rewrite-plan.md`](doc/rewrite-plan.md) + [ADR 0001](doc/adr/0001-client-framework.md).
- Transport: `faye-websocket` (unmaintained, last release 2021) → **`ws`**, protocol
  framing unchanged, server-only change ([ADR 0002](doc/adr/0002-websocket-transport.md)).
- Server is modernized (ESM/TS, deps, Docker) but **not** re-frameworked — its design stays.
- Deploy target: CI builds a multi-stage Docker image, `docker compose` pulls & runs it
  ([`doc/deployment.md`](doc/deployment.md)).
- Do build/deps/ESM (roadmap phases 1–3) before/with the rewrite; never a big-bang.

## Common tasks

### Add a bonus

1. Create `src/server/model/Bonus/BonusXxx.js` extending the right base
   (`BonusSelf` / `BonusEnemy` / `BonusLeader` / `BonusGame` / `BonusAll`, ultimately
   `src/shared/model/BaseBonus.js`).
2. Register it in `src/server/model/RoomConfig.js` `bonusTypes` **and** add a default
   on/off entry in `src/shared/model/BaseRoomConfig.js` `bonuses`.
3. If it needs client-side visuals/behavior, add the matching model under
   `src/client/model/bonus/` and check `src/client/manager/BonusManager.js`.
4. The bonus sprite sheet is `web/images/bonus.png`.

### Add a server socket event

Attach/detach in the relevant controller (`src/server/controller/RoomsController.js` for
lobby-level, `RoomController` for in-room, `GameController` for in-game), following the
existing `this.callbacks = { ... }` + `attachEvents`/`detachEvents` pairing.

### Change shared game rules

Edit the `Base*` class, then verify the `client/` and `server/` subclasses still make
sense. Balancing constants live as `prototype` properties (e.g.
`BaseAvatar.prototype.velocity`, `BaseGame.prototype.warmupTime`).

## MCP servers available

- **context7** (`resolve-library-id` → `query-docs`) — current docs for any library
  (Vite, esbuild, AngularJS, Express, `ws`, React, ...). Use before adopting/upgrading a
  dependency.
- **deepwiki** (`ask_question`, `read_wiki_*`) — Q&A over GitHub repos.
  Note: `Elao/curvytron` is **not indexed** on deepwiki as of writing.
- **sonarqube** (`search_sonar_issues_in_projects`, `show_rule`, ...) — code-quality /
  security findings. `.sonar/` exists in the repo but is currently empty (not wired up).

## Do not commit

`config.json`, `node_modules/`, `bower_components/`, `web/js/`, `web/css/`,
`web/index.html`, `bin/`, `stats/`, `dist/`, `coverage/`, `.env*`, `*.log`.
