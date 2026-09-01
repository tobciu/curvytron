# CLAUDE.md

Working notes for Claude Code (and other automated contributors) on this repository.
Human-facing overview is in [`README.md`](README.md).

**Documentation map:**

- [`doc/architecture.md`](doc/architecture.md) — how the codebase fits together
- [`doc/game-rules.md`](doc/game-rules.md) — physics, trail, collision, scoring, bonuses, constants
- [`doc/protocol.md`](doc/protocol.md) — the WebSocket event reference (both directions verified)
- [`doc/flows.md`](doc/flows.md) — sequence diagrams for the main flows
- [`doc/assets.md`](doc/assets.md) — sprite sheet / sounds / icon font inventory
- [`doc/conversion-notes.md`](doc/conversion-notes.md) — the AngularJS→Svelte / JS→TS rewrite log (per-phase progress)
- [`doc/deployment.md`](doc/deployment.md) — target Docker image + `docker compose` + CI build
- [`doc/rewrite-plan.md`](doc/rewrite-plan.md) — the original rewrite playbook (background)
- [`doc/modernization-roadmap.md`](doc/modernization-roadmap.md) — phased plan (background)
- [`doc/legacy-build-notes.md`](doc/legacy-build-notes.md) — how the *frozen 2015 build* worked (historical)
- [`doc/adr/`](doc/adr) — ADR 0001 (Svelte), ADR 0002 (`ws` transport)

## What this is

Curvytron — a server-authoritative real-time multiplayer "curve" game. **Node 24 + ESM/TS**
server (Express 5 + raw WebSocket via `ws`), **Svelte 5 + Vite** browser client with a
`<canvas>` renderer kept out of Svelte's reactivity. Fork of `Elao/curvytron`; the 2015
AngularJS/Gulp/Bower stack has been rewritten on the `modernize` branch.

The frozen legacy build is gone from `src/`. Its extracted artifacts live in
[`doc/reference-build/`](doc/reference-build) for reference only.

## Build & run

Everything is npm scripts ([`package.json`](package.json)). Node **>= 24**.

| Command | Effect |
| --- | --- |
| `npm install` | Plain install — no `postinstall`, no Bower. |
| `npm run build` | `build:server` + `build:client` → `dist-server/main.js` + `dist/` |
| `npm run build:server` | esbuild bundle `src/server/main.ts` → `dist-server/main.js` ([`scripts/build-server.mjs`](scripts/build-server.mjs)) |
| `npm run build:client` | `vite build` → `dist/` (client bundle + `web/` media copied in) |
| `npm start` | `node dist-server/main.js` — serves `dist/` if built, else `web/`, port 8080 |
| `npm run dev:client` | Vite dev server (proxies `/socket` → `ws://localhost:8080`) |
| `npm run dev` | Rebuild the server bundle on `src/**` change (run `npm start` alongside) |
| `npm run typecheck` | `tsc --noEmit` over `src/shared` + `src/server` + `scripts` |
| `npm run check` | `svelte-check` over `src/client` |
| `npm run lint` | ESLint (flat config, [`eslint.config.js`](eslint.config.js)) |
| `npm test` | Vitest — `src/{shared,server}/**/*.{test,spec}.ts` (Node env) |

Local dev loop: `npm start` in one shell, `npm run dev:client` in another, open the Vite URL.
Green gate before committing: `npm run typecheck && npm run check && npm run lint && npm test && npm run build`.

- **Build outputs are git-ignored** (`dist/`, `dist-server/`, `stats/`, `coverage/`). Never commit them.
- `config.json` (git-ignored) is optional; [`src/server/main.ts`](src/server/main.ts) `loadConfig()`
  falls back to `{ port: 8080 }` and reads `PORT` / `STATIC_DIR` / `INSPECTOR_ENABLED` from env.

## Architecture rules you must know before editing

1. **Real ESM modules.** `src/**` is `import`/`export` TypeScript. `tsconfig` uses
   `NodeNext` + `allowImportingTsExtensions` — **import with the `.ts` extension**
   (`import { Foo } from './Foo.ts'`). Path alias: `@shared/*` → `src/shared/*`
   (vite also has `@client`). No global-concatenation bundle any more.
2. **Shared base classes.** `src/shared/model/BaseX.ts` is a real `class` extended by
   **both** `src/client/model/X.ts` and `src/server/model/X.ts`
   (`class X extends BaseX`). Editing a `Base*` file changes client **and** server —
   check both subclasses. Some `Base*` only have a server subclass now (the client
   uses stores instead of a full model — e.g. there is no client `Room`/`RoomConfig`).
3. **Base → concrete-subclass wiring uses `static` fields.** Where a base constructs a
   collaborator whose concrete type differs per side (`BaseAvatar`→`Trail`/`BonusStack`,
   `BaseGame`→`BonusManager`/`FpsLogger`, `BasePlayer`→`Avatar`, `BaseRoom`→…), the base
   reads `(this.constructor as typeof BaseX).FooClass` and the subclass does
   `static override FooClass = Foo`. **Must be `static`** — instance-field initializers
   run *after* `super()`, too late. See [`doc/conversion-notes.md`](doc/conversion-notes.md).
4. **`EventEmitter` = `eventemitter3`** — `import { EventEmitter } from 'eventemitter3'`
   (named import; the default import mis-types under `verbatimModuleSyntax`).
5. **Wire protocol** = [`src/shared/core/BaseSocketClient.ts`](src/shared/core/BaseSocketClient.ts).
   Outgoing events batch into `JSON.stringify([[name, data, callbackId?], ...])`, flushed on
   an interval (`client.addEvent(name, data, cb)`; `force` bypasses batching). Incoming
   array entries with a **numeric** first element are RPC callback replies. **Not**
   Socket.IO. Client-side the typed wrapper is [`src/client/lib/socket/`](src/client/lib/socket)
   (`events.ts` type maps + `client.ts` `on`/`off`/`emit`/`request()`).
6. **Transport.** Server: `ws` `WebSocketServer({ noServer: true })` on HTTP `upgrade`,
   wrapped to the shared `SocketLike` by `wsAdapter()` in
   [`src/server/core/SocketClient.ts`](src/server/core/SocketClient.ts). Browser: native
   `WebSocket` satisfies `SocketLike` directly; [`src/client/core/SocketClient.ts`](src/client/core/SocketClient.ts)
   buffers frames until OPEN and does the `whoami` handshake.
7. **Game loop.** Server: authoritative fixed-timestep `setTimeout`
   (`BaseGame.framerate = 1000/60`, `BaseGame.loop`). Client: its own `requestAnimationFrame`
   render loop over the same base — [`src/client/model/Game.ts`](src/client/model/Game.ts),
   driven by [`src/client/lib/stores/game.ts`](src/client/lib/stores/game.ts).
8. **Server collision** — spatial grid: `World` holds a grid of `Island`s
   (`islandGridSize = 40`); avatar trail points become `AvatarBody` entries;
   `World.getBody(body)` / `getBoundIntersect(...)` in
   [`src/server/model/Game.ts`](src/server/model/Game.ts) `update()`.
9. **Client canvas stays out of Svelte.** `Game`/`Avatar`/`BonusManager` are plain
   classes owning `<canvas>` elements; `Game.svelte` hands them the DOM nodes and the
   `game` store bridges wire events ↔ reactive HUD state. Do not put per-frame state in runes.
10. **Deferred legacy (still `.js`, not wired up):** `src/server/trackers/*.js`,
    server `Inspector` — InfluxDB metrics, config-gated off. Ignored by tsc/eslint.

## Conventions / constraints

- ESLint flat config carries the old `.jshintrc` spirit (single quotes, `eqeqeq`, `curly`,
  `camelcase`, `no-var`, `prefer-const`) as **warnings**; `no-explicit-any` is off.
  `src/client/**` is checked by `svelte-check`, not ESLint (no `eslint-plugin-svelte` yet).
- `.editorconfig`: 4-space, LF, UTF-8, final newline.
- Style/comments: terse `/** ... */` headers, matching surrounding files.
- Balancing constants are `static readonly` on the `Base*` class, with mutable per-instance
  copies where bonuses change them (e.g. `BaseAvatar.velocity`, `BaseGame.warmupTime`).

## Common tasks

### Add a bonus

1. Create `src/server/model/Bonus/BonusXxx.ts` extending the right base
   (`BonusSelf` / `BonusEnemy` / `BonusLeader` / `BonusGame` / `BonusAll`, ultimately
   [`src/shared/model/BaseBonus.ts`](src/shared/model/BaseBonus.ts)).
2. Register it in [`src/server/model/RoomConfig.ts`](src/server/model/RoomConfig.ts)
   `bonusTypes` **and** add a default on/off entry in
   [`src/shared/model/BaseRoomConfig.ts`](src/shared/model/BaseRoomConfig.ts) `bonuses`.
3. Client visuals: the icon comes from the sprite sheet `web/images/bonus.png` via
   `BonusManager.spritePosition` in [`src/client/manager/BonusManager.ts`](src/client/manager/BonusManager.ts)
   — add the class name there. Custom behaviour → a model under `src/client/model/bonus/`.

### Add a server socket event

Attach/detach in the relevant controller
([`RoomsController.ts`](src/server/controller/RoomsController.ts) lobby-level,
`RoomController` in-room, `GameController` in-game), following the existing
`this.callbacks = { ... }` + `attachEvents`/`detachEvents` pairing. Then add the payload
type to the client's [`src/client/lib/socket/events.ts`](src/client/lib/socket/events.ts)
map and handle it in the relevant store.

### Change shared game rules

Edit the `Base*` class, then verify the `client/` and `server/` subclasses still make
sense (and that a client subclass still exists — some don't).

## MCP servers available

- **context7** (`resolve-library-id` → `query-docs`) — current docs for any library
  (Vite, Svelte, esbuild, Express, `ws`, ...). Use before adopting/upgrading a dependency.
- **deepwiki** (`ask_question`, `read_wiki_*`) — Q&A over GitHub repos.
- **sonarqube** — code-quality / security findings. `.sonar/` exists but is not wired up.

## Do not commit

`config.json`, `node_modules/`, `dist/`, `dist-server/`, `stats/`, `coverage/`, `.env*`, `*.log`.
