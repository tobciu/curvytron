# Client rewrite plan (AngularJS → Svelte + Vite)

Concrete, incremental playbook for replacing the AngularJS shell. Framework choice and
rationale: [`adr/0001-client-framework.md`](adr/0001-client-framework.md). Transport:
[`adr/0002-websocket-transport.md`](adr/0002-websocket-transport.md). This plan sits under
Phase 4 of the [modernization roadmap](modernization-roadmap.md) and folds Phase 1 (build
swap) into its first steps.

## Principles

1. **Incremental, screen by screen.** Migrate one screen per PR; delete the matching
   AngularJS controller/view as each replacement lands. Not a parallel from-scratch rewrite
   (that is what stalled `origin/ai_migrate`) — but the old app is **not** kept running
   alongside either (see #2).
2. **Verify per phase, not per commit.** The owner has relaxed "runnable at every commit":
   intermediate states need not boot. Each *phase* ends in a verifiable state; the Phase 0
   **reference build** (not `gulp`) is the fallback. See
   [`pre-implementation-checklist.md`](pre-implementation-checklist.md).
3. **Keep the engine.** `src/shared/**`, `src/client/core/*`, `src/client/model/*`,
   `src/client/animation/*` are **reused** — converted to ES modules / TypeScript, not
   rewritten. The canvas renderer never goes through Svelte's reactivity.
4. **Transport is a separate track.** The `faye-websocket` → `ws` swap (ADR 0002) touches
   only the server and lands with Phase 1.
5. **Behaviour parity first.** Match today's screens and rules exactly; redesign later.

## Target layout

```
src/client/
  main.ts              # Vite entry, mounts App.svelte
  App.svelte           # shell: header/footer, <Router/>, profile panel, connection state
  routes/
    RoomsList.svelte   # "/"
    Room.svelte        # "/room/:name"
    Game.svelte        # "/game/:name"  (wraps the canvas)
    About.svelte       # "/about"
  lib/
    socket/            # SocketClient wrapper + typed event map + request() helper
    stores/            # rooms, room, profile, game — Svelte stores fed by socket events
    components/         # Chat, PlayerList, RoomConfig, KillLog, Scoreboard, ColorPicker…
  core/  model/  animation/   # existing engine code, now ESM/TS
  sass/                # existing styles, imported by Vite
index.html             # new Vite HTML entry (replaces web/index.html generation)
vite.config.ts
```

Server change is minimal: `express.static('web')` still serves assets; point it at Vite's
build `outDir` (e.g. `web/` or a new `dist/`) and serve `index.html` as the SPA fallback.

## Steps

### Step 0 — Tooling: Vite + Svelte scaffold (roadmap Phase 1)

- `npm create vite@latest` → Svelte + TS template; add `svelte`, `@sveltejs/vite-plugin-svelte`,
  `vite`, `typescript`, `sass`. Commit `package-lock.json`.
- **Delete `gulpfile.js`, `bower.json`, `bower-resolutions.json`, the `scripts.install`
  hook** now — the [reference build](legacy-build-notes.md#reference-build-phase-0-task) is
  the fallback, not `gulp`.
- `vite.config.ts`: build `outDir` → `dist/`; dev server `proxy` so the WebSocket hits the
  Node server during `npm run dev`.
- Port the two non-JS Gulp tasks: SASS (`src/sass/style.scss` — Vite handles it) and the
  Google-Analytics token (now **runtime** — injected by the server or a tiny
  `transformIndexHtml` plugin from `config.json` / `GA_ID` env).
- **Verify:** `npm run build` produces a served bundle; a placeholder `App.svelte` renders
  at `/`.

### Step 1 — Make the engine importable (roadmap Phase 2, scoped)

- Convert, leaf-first, to ES modules with explicit `import`/`export` (drop the
  concatenation-globals assumption): `src/shared/**` → `src/client/core/*` →
  `src/client/model/*` → `src/client/animation/*`.
- Add `tsconfig.json` with `allowJs`/`checkJs`; rename to `.ts` opportunistically. Start
  with the pure-logic files that have the most value under types: `Compressor`,
  `Collection`, `BaseSocketClient`, `BaseAvatar`, `BaseGame`, `BaseTrail`,
  `BaseRoomConfig`.
- Replace the `tom32i-*` Bower libs: `EventEmitter` → **`eventemitter3`** (npm, Node +
  browser); gamepad/key-mapper → `gamepad.js` npm or a small local module;
  `option-resolver` → inline a tiny helper or drop.
- **Verify:** engine modules import cleanly into a throwaway script; `BaseSocketClient`
  round-trips a framed message in a unit test (first Vitest test — roadmap Phase 5 starts
  here).

### Step 2 — Socket layer

- `lib/socket/events.ts`: a **typed event map** — every event name from
  [`protocol.md`](protocol.md) with direction and payload type. Both client and (later)
  server import it.
- `lib/socket/client.ts`: thin wrapper around the existing `SocketClient` exposing
  - `connect()` / `connected` store / `clientId`
  - `on(event, handler)` / `off`
  - `request(name, data): Promise<Reply>` — wraps the positional-callback mechanism
- `lib/stores/*`: `writable` stores hydrated from socket events, replacing the AngularJS
  `*Repository` services:
  - `rooms` ← `room:open`/`room:close`/`room:players`/`room:game`
  - `room` ← the `room:join` snapshot + in-room broadcasts
  - `profile` ← local players/colours, persisted to `localStorage` (replaces
    `angular-cookies` + `Profile` service)
  - `game` ← game/round/score events (the HUD reads this; the canvas does not)
- **Verify:** with the old UI still in place, log store contents in the console while
  joining a room manually — values match the AngularJS state.

### Step 3 — App shell + routing

- `App.svelte`: header, footer, profile panel, `connecting` / `disconnected` states
  (ports `src/client/views/index.html` + `CurvytronController`).
- Routing: keep the current **hash routes** (`/`, `/room/:name`, `/game/:name`, `/about`)
  so links/bookmarks are unchanged — `svelte-routing` or a ~30-line hash router.
- Mount `main.ts` from the new `index.html`. At this point the app boots into Svelte but
  most routes are stubs.
- **Verify:** navigation between stub routes works; connection banner reflects real socket
  state.

### Step 4 — Migrate screens (one PR each)

Screen inventory (visual baseline = `doc/images/*.png`):

| Screen | Screenshot | Today (AngularJS) | New (Svelte) |
| --- | --- | --- | --- |
| First-run profile prompt | *(live only — "Hi there!")* | `CurvytronController` + `views/profile/*` | folded into `Profile.svelte` / onboarding guard |
| Rooms list (+ empty state) | `rooms-overview.png` | `RoomsController` + `views/rooms/list.html` | `routes/RoomsList.svelte` |
| Room / lobby | `lobby.png` | `RoomController` + `PlayerListController` + `ChatController` + `views/rooms/detail.html` | `routes/Room.svelte` + `PlayerList` / `Chat` components |
| Room config (master) | `lobby-with-config-panel.png` | `RoomConfigController` + `views/room/parameters.html` (+ `model/preset/*`) | `RoomConfig.svelte` |
| Profile panel | `my-profile.png` | `ProfileController` + `Profile` service + `views/profile/*` | `Profile.svelte` + `stores/profile` (localStorage) |
| Round countdown / HUD | `game-start-with-countdown.png` | `GameController` + `RoundController` + `WaitingController` + `MetricController` | `routes/Game.svelte` HUD + `stores/game` |
| In play | `game-with-trail-and-bonus.png` | `GameController` + `GameRepository` + `core/Canvas` | canvas mounted in `Game.svelte` (Step 5) |
| Round won | `game-over-round-won.png` | `RoundController` + `KillLogController` | `RoundOverlay.svelte` + `KillLog.svelte` |
| Final scoreboard | `game-end-score-board.png` | `GameController` end state + `views/game/play.html` | `Scoreboard.svelte` |

Order = simplest first, so the pattern is proven before the hard screen:

1. **About** (`/about`) — static; trivial.
2. **Rooms list** (`/`) — render `rooms` store; "create room" (`room:create` via
   `request()`), "join" (`room:join`, handle password prompt + errors).
3. **Profile panel** — local player identities, colour picker, name, key bindings; persist
   to `localStorage`.
4. **Room / lobby** (`/room/:name`) — the biggest shell screen: player list, add/remove
   player, ready toggle, chat (`Chat` component), room-config panel (master-only:
   max-score, bonusRate, per-bonus toggles), kick votes, launch countdown. Port
   `RoomController` + `RoomConfigController` + `ChatController` + `PlayerListController`
   logic into components reading the `room` store.
5. **Game HUD** (`/game/:name`) — scoreboard, round messages, kill log, waiting/warmup
   overlays, spectator count, latency. Reads the `game` store. (Canvas handled in Step 5.)

Each screen: delete the corresponding AngularJS controller + view once its Svelte version
is live and smoke-tested.

### Step 5 — Game canvas component

- `routes/Game.svelte` owns a `<canvas bind:this={el}>` and, in `onMount`, instantiates
  the **existing** client `Game`/`Canvas` renderer + `PlayerInput` against that element;
  `onDestroy` tears them down.
- The renderer keeps its own `requestAnimationFrame`/loop and consumes socket events
  directly (as today via `GameRepository`) — **not** through Svelte stores. Svelte only
  drives the surrounding HUD.
- Input: `PlayerInput` already emits `move`; forward to `socket` as `player:move`.
- **Make the game view responsive** (it isn't today): canvas scales to viewport, HUD
  becomes a collapsible panel / overlay on narrow screens, touch zones usable on mobile.
- **Verify:** full round with 2 local players + a spectator tab; trails, bonuses, death,
  scoring, borderless, `clear` all behave as before; no frame drops from Svelte; playable
  at 375 px wide.

### Step 6 — Replace remaining AngularJS-era libs

- `angular-bootstrap-colorpicker` → a small Svelte colour component (or `@melloware/coloris`),
  keeping the YIQ-brightness validation from `BasePlayer.validateColor`.
- `createjs-soundjs` → Web Audio API wrapper or `howler` (`SoundManager` becomes a plain
  module).
- `angular-cookies` → `localStorage` (done in Step 2/4).
- `angular` / `angular-route` → removed once no view depends on them.

### Step 7 — Delete the old build

- Remove `gulpfile.js`, `bower.json`, `bower-resolutions.json`, `.jshintrc`, the
  `src/client/views/*` Angular templates, `src/client/controller/*`,
  `src/client/service/*` that were ported, `src/client/app.js`.
- `Dockerfile` → `node:24-alpine` multi-stage; `docker-compose.yml` → pulled `image:`.
  Full target and CI image-push: [`deployment.md`](deployment.md).
- Update `README.md`, `CLAUDE.md`, `doc/installation.md`, `doc/dev.md` to the new
  commands. Update `.gitignore` (drop `bower_components/`, add `dist/` if used).
- **Verify:** clean checkout → `npm ci && npm run build && npm start` → play a round.
  `docker compose up --build` → play a round.

## Verification checklist (run every step)

- `npm run build` succeeds; `npm start` serves the game.
- 2 local players can create a room, ready up, play a full round to a game win.
- A third tab can spectate mid-game and sees correct state.
- Chat, colour change, name change, kick vote, room-config toggles work.
- Reconnect screen appears when the server is killed.
- No console errors; game holds ~60 fps during play.
- (From Phase 5) `npm run lint` and `npm test` pass in CI.

## Rollback

Until Step 7, `gulp` + the AngularJS sources remain in the tree and can build the old
client. Each screen PR is small and revertible. `main` is never touched; all work is on
`modernize`.
