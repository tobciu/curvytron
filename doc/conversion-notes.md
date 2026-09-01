# ESM/TS conversion notes (Phase 1)

Mechanical rules for turning the concat-globals `src/**/*.js` into ESM/TS modules.
Living document — extended as cases come up.

## Unit of work

- **Standalone pseudo-class** (no sub/superclass in the Curvytron hierarchy, e.g.
  `Collection`, `Compressor`, `BaseTickrateLogger`): convert straight to `class` + ESM
  `export`, delete the `.js`.
- **Hierarchy** (`Base*` + its `client/*` and `server/*` subclasses): convert **all
  members together** in one slice — you cannot `Base.call(this)` a `class`, so a half-
  converted hierarchy does not run. (That's acceptable mid-Phase-1, but keep the slice
  whole.)

## Rules

| Legacy | Becomes |
| --- | --- |
| `function Foo(a){ ... }` + `Foo.prototype.x = ...` | `export class Foo { constructor(a) { ... } x() {} }` |
| `EventEmitter.call(this)` + `Foo.prototype = Object.create(EventEmitter.prototype)` | `import { EventEmitter } from 'eventemitter3'` → `export class Foo extends EventEmitter { constructor() { super(); ... } }` |
| `BaseFoo.call(this, a)` | `super(a)` |
| `BaseFoo.prototype.method.call(this, x)` | `super.method(x)` |
| `Foo.prototype.CONST = 5` (balancing constants) | `readonly CONST = 5` class field (or `static` where it was read via `Foo.prototype.CONST`) |
| `this.cb = this.cb.bind(this)` in ctor | keep as-is for now (callbacks passed to `setTimeout`/events); arrow-field cleanup is Phase 2 |
| bundle-global reference to another class | `import { Other } from './Other.ts'` |
| **Base→concrete-subclass reference** (only 7: `BaseAvatar`→`Trail`/`BonusStack`, `BaseRoom`→`RoomConfig`/`Game`, `BaseGame`→`BonusManager`/`FPSLogger`, `BasePlayer`→`Avatar`) | Base declares a **`static`** injected class ref (`static TrailClass = BaseTrail`); the base constructor reads it via `(this.constructor as typeof BaseX).TrailClass`; each concrete subclass does `static override TrailClass = Trail`. **Must be `static`, not an instance field** — an instance-field initializer runs *after* `super()`, so the base constructor would still see the base default. |

## Conventions

- **Imports use the explicit `.ts` extension** (`./Foo.ts`) — the bundler (esbuild) and
  Vitest resolve it; `tsc` is `--noEmit` with `allowImportingTsExtensions`.
- **`EventEmitter`**: always the **named** import `import { EventEmitter } from 'eventemitter3'`
  (the default import mis-types as "not a constructor" under `verbatimModuleSyntax`).
- **Timer handles**: `ReturnType<typeof setInterval> | null` (works in Node and browser;
  keeps `src/shared` env-neutral).
- **`src/shared` stays env-neutral**: no `node:*` imports, no DOM. Anything Node- or
  browser-specific lives in `src/server` / `src/client`.
- **Tests** colocate as `*.test.ts` next to the module (or `<group>.test.ts` for a set).
  Every converted module gets at least a smoke test; pure-logic modules get real coverage.
- **Behaviour parity**: port quirks verbatim and pin them in tests (e.g.
  `Collection.map`/`filter` reverse order, `Compressor` truncates negatives toward zero).
  Cleanups wait for Phase 2.

## Progress

| Module / hierarchy | Status |
| --- | --- |
| `shared/Collection` | ✅ `ab91567` |
| `shared/service/Compressor` | ✅ `ab91567` |
| `shared/service/BaseFPSLogger` + `server/service/FPSLogger` | ✅ `acbfa89` |
| `shared/service/BaseTickrateLogger` | ✅ `acbfa89` |
| `shared/core/BaseSocketClient` (+ `SocketLike` iface for the `ws` adapter) | ✅ |
| `shared/model/BaseTrail` + `{client,server}/model/Trail` | ✅ (client Trail has no DOM deps) |
| `shared/model/BaseBonusStack` (base only) | ✅ base |
| **Bonus subsystem** — BaseBonus + server/model/Bonus/* (25) + server/manager/BonusManager | ✅ |
| `shared/model/BaseAvatar` (base; injects `TrailClass`/`BonusStackClass`, default to the base classes) | ✅ base |
| `shared/model/BasePlayer` (base; injects `AvatarClass`) | ✅ base |
| `server/model/*` (Avatar, Player, Room, Game, RoomConfig, BonusStack, …) | ✅ `94e95a4` |
| `shared/model/BaseRoomConfig` (base only; concrete RoomConfig needs the bonus classes) | ✅ base |
| `shared/manager/BaseBonusManager` (base; the rest of the bonus subsystem still deferred) | ✅ base |
| `shared/model/BaseGame` (base; injects `FpsLoggerClass`/`BonusManagerClass`) | ✅ base |
| `shared/service/BaseChat` (base) | ✅ base |
| `server/{core,controller,manager,repository,service}/*` + `main.ts` (ws) | ✅ `94e95a4` |
| `shared/model/BaseRoom` (base; injects RoomConfigClass/GameClass) | ✅ base |
| `server/core/Inspector` + `server/trackers/*` (InfluxDB) | ⬜ deferred (config-gated off) |
| **client** `src/client/**` (engine → ESM/TS, then Svelte shell) | ⬜ Phase 2 |
| `shared/model/Preset` + client presets | ⬜ Phase 2 (client-only UI) |
| `server/core/{Body,AvatarBody,Island,World}` (collision grid) | ✅ |

## Phase 1 acceptance — reached

`npm run build && PORT=xxxx node dist-server/main.js` on **Node 24**:

- serves the Phase-0 reference client from `web-ref/` (assembled by
  `scripts/prepare-reference-web.mjs`)
- the legacy AngularJS client connects and the lobby works
- a scripted WS client can `whoami` → create → join → add players → ready
- **a full round runs**: `round:new` → `game:start` → ~60 fps `position`
  frames → bonus spawn → deaths → `round:end`

Server is fully ESM/TS on `ws` (no `faye-websocket`, no `dependencies.js`,
no gulp). Inspector + trackers are stubbed out (deployed config has them
off) — port them if metrics are wanted.

## Phase 2 progress

- **Step 0** ✅ Vite + Svelte 5 scaffold (`5b2208d`)
- **Step 1a** ✅ client engine primitives → TS: `core/{Canvas,SocketClient,StopWatch}`,
  `animation/{BounceIn,Explode,ExplodeParticle}` (`a797a52`)
- **Step 1b (part)** ✅ vendored libs + input stack:
  `lib/{SpriteAsset, mappers}` (replace `tom32i-asset-loader` / `tom32i-key-mapper`),
  `model/{Client, RoomListItem, PlayerControl, PlayerInput, Player}`.
  Gamepad capture is stubbed (`GamepadMapper` / `PlayerInput` gamepad branch) —
  was unfinished upstream too; keyboard + touch are live.
- **Step 1b (rest)** ✅ (with Step 5) `model/{Avatar, Game, BonusStack}` → TS,
  `manager/BonusManager` → TS, `model/bonus/{MapBonus, StackedBonus}` → TS.
  The legacy `model/{Room, RoomConfig}` and `model/{message,preset}/*` are **not
  ported** — the `room` / `game` stores replace them. `model/*.js` (AngularJS)
  still present, deleted in Step 7.
- **Steps 2–5** ✅ typed socket layer + stores → shell + routing → screen migration →
  canvas game (detail below). **Steps 6–7** ⬜ lib swaps → delete AngularJS.

- **Step 2** ✅ typed socket layer + first stores:
  `lib/socket/{events.ts, client.ts}` (typed `ServerToClient`/`ClientToServer`
  maps + a `request()` promise wrapper over the positional callback),
  `lib/stores/{profile.ts (localStorage), rooms.ts (lobby list)}`.
  `SocketClient` now buffers outgoing frames until the WS is OPEN.
- **Step 3** ✅ shell + routing: `lib/router.ts` (hash routes `/`, `/about`,
  `/room/:name`, `/game/:name`), `App.svelte` (header / footer / connection
  banner / route switch), `routes/{RoomsList, About, Room, Game}.svelte`
  (RoomsList wired to the store + `room:create` RPC; Room/Game are stubs).
  Verified end to end against the modern server: connect → create room →
  route to the lobby.
- **Step 4** ✅ real screens:
  - **Profile** (`e846960`) — `routes/Profile.svelte` + `components/KeyBinding.svelte`
    + blocking onboarding modal in `App.svelte` when the profile has no name.
  - **Room / Lobby** (`bc886bb`) — `lib/stores/room.ts` (a reactive store hydrated
    from the `room:join` RPC snapshot, then kept in sync from every in-room
    broadcast) + `routes/Room.svelte` (password gate, player list with
    add/ready/remove/kick/crown, master config panel, chat, launch).
- **Step 5** ✅ canvas game + HUD:
  - `model/Game.ts` — `BaseGame` subclass running an rAF render loop over four
    stacked `<canvas>` layers (trails / bonuses / heads / death particles), kept
    out of Svelte's cycle. `model/Avatar.ts`, `model/BonusStack.ts`,
    `manager/BonusManager.ts`, `model/bonus/{MapBonus,StackedBonus}.ts`.
  - `lib/stores/game.ts` — builds the `Game` from the current `room` state,
    wires every in-game wire event (position/angle/point/die/score/bonus:*/
    round:*/clear/borderless/end/game:leave/spectate), drives the `ready`
    handshake, and exposes reactive HUD state (scoreboard, phase, warmup
    countdown, kill log, recap, fps/ping).
  - `routes/Game.svelte` — the four canvases + left HUD (players, metrics, chat)
    + overlays (waiting / warmup / round-end / game-end recap). Local
    `PlayerInput` `move` events → `player:move`. `ResizeObserver` keeps the
    square arena fitted. Room membership is handed off both ways via a
    route check in `onDestroy` (no leave when navigating room ↔ its game).
  - Verified in the browser against the modern server: create → ready →
    warmup countdown → server-driven movement + trail → arrow-key steering
    turns the curve → wall crash → kill log + round/game-end overlays +
    scoreboard → "Back to the room" preserves membership.
- **Step 6** ⬜ replace `angular-bootstrap-colorpicker` / `createjs-soundjs` (Web Audio).
- **Step 7** ⬜ delete AngularJS (`app.js`, `controller/`, `service/`, `repository/`,
  `views/`, `model/*.js`), `gulpfile.js`, `bower.json`, `.jshintrc`, the `web-ref`
  fallback; modern multi-stage `node:24-alpine` Dockerfile.
