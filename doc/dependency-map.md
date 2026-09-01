# Dependency map — legacy → target

What every current dependency becomes. Resolves checklist item "Dependency map,
Bower → npm/vendor/dropped".

## Client — Bower (`bower.json`) → target

The Svelte rewrite drops the whole AngularJS stack; only the **engine libs** carry over.
The concat list is in [`gulpfile.js`](../gulpfile.js) `dependencies[]`.

| Bower package | Provides (globals) | Used in `src/`? | Target |
| --- | --- | --- | --- |
| `angular@1.4.3` | `angular` | yes — the whole shell | **dropped** (→ Svelte 5) |
| `angular-route@~1.4.3` | `ngRoute` | `app.js` routes | **dropped** (→ hash router / `svelte-routing`) |
| `angular-cookies@~1.4.3` | `ngCookies` | `Profile` service | **dropped** (→ `localStorage`) |
| `angular-bootstrap-colorpicker@~3.0` | `colorpicker.module` | profile / player colour | **dropped** (→ small Svelte colour component; keep `BasePlayer.validateColor` YIQ check) |
| `createjs-soundjs@0.6.1` | `createjs.Sound` | `SoundManager` (7 call sites) | **dropped** (→ Web Audio API wrapper, or `howler`) |
| `html5-boilerplate@~4.3.0` | — (HTML/CSS scaffold) | `views/index.html` base | **dropped** (Vite `index.html`) |
| `tom32i-event-emitter.js@~0.1` | `EventEmitter` | **everywhere** (`EventEmitter.call(this)` + `Object.create(EventEmitter.prototype)` in every `Base*`, repositories, controllers) | **npm** — `tom32i-event-emitter.js` is on npm and **actively maintained** (v2.3.0, Apr 2026) and is the exact API the code targets. Alternative: `eventemitter3` (v5, standard, but drops the `newListener`/`removeListener` events — code uses none of `once`/`removeAllListeners`/`prependListener`, so either works). **Decision: `eventemitter3`** for ecosystem weight; fall back to `tom32i-event-emitter.js` if any incompat shows up. |
| `tom32i-key-mapper.js@~0.1` | `KeyboardMapper`, `TouchMapper`, `GamepadMapper` (+ base `Mapper`) | `PlayerControl` (`addMapper('keyboard'/'touch'/'gamepad', …)`) | **vendor** — `key-mapper.js` exists on npm (v0.1.2, 2025) but tiny; each mapper is ~40 lines. Vendor to `src/client/lib/` as TS (a clean reimplementation already exists on `origin/ai_migrate:src/client/lib/` to cross-check). |
| `tom32i-gamepad.js@~0.1` | `GamepadListener` | `app.js` (`new GamepadListener({analog:false, deadZone:0.4})`), consumed by `GamepadMapper` | **vendor** — not on npm. ~260 lines (raw `navigator.getGamepads()` poll loop). Vendor to `src/client/lib/GamepadListener.ts`. |
| `tom32i-option-resolver.js@~0.0` | `OptionResolver` | **not referenced anywhere in `src/`** | **dropped** (dead concat entry) |
| `tom32i-asset-loader.js@~0.0` | `SpriteAsset` (`AssetLoader`) | `client/manager/BonusManager` (`new SpriteAsset('images/bonus.png',3,7,cb,true)`) — that's the only use | **vendor** — `tom32i-asset-loader.js` on npm (v2.0.0, 2016) but only `SpriteAsset` is used, ~40 lines. Vendor to `src/client/lib/SpriteAsset.ts`. |

**Net:** the rewrite adds **1 npm dep** (`eventemitter3`) and **3 vendored files**
(`GamepadListener`, the 3 mappers, `SpriteAsset`) — ~400 lines total. Everything else is
deleted.

## Server — `package.json` → target

| Current | Where | Target |
| --- | --- | --- |
| `express@^4.13.3` | `Server.js` — only `express.static` + an `http.Server` | **`express@5`** (or drop for a ~20-line static handler; Express earns little here) |
| `faye-websocket@^0.10` | `dependencies.js`, `Server.js` upgrade handler | **`ws`** ([ADR 0002](adr/0002-websocket-transport.md)) |
| `influx@^4.0.1` | `Inspector` / trackers, only when `inspector.enabled` | **`@influxdata/influxdb-client`**, dynamic `import()` inside the Inspector only |
| `usage@^0.7` *(optional)* | `Inspector` CPU/mem | **dropped** → `process.resourceUsage()` / `process.memoryUsage()` / `os.loadavg()` |
| `MD5@^1.3` *(optional)* | (hashing — grep: only referenced in `dependencies.js` `try/catch`, no real call site found) | **dropped** → `node:crypto` `createHash('md5')` if a use surfaces |
| `node` built-ins: `events`, `http` | shared + `Server.js` | `node:events` (or `eventemitter3` shared with the client), `node:http` |

`src/server/dependencies.js` (the sole `require` site + the optional-dep `try/catch`) is
**deleted**; each module imports what it needs.

## Node / toolchain

| Current | Target |
| --- | --- |
| Node `v0.10.48` (only inside `cyrale/curvytron`) | **Node 24 LTS** |
| Bower + `scripts.install` hook | **npm** + committed `package-lock.json` |
| Gulp 3 (`gulp-concat/uglify/sass@0.7/...`) | **Vite** (client) + `esbuild`/`tsc` (server bundle) |
| JSHint (`.jshintrc`, `es3`) | **ESLint** (rules ported) + `svelte-check` |
| — | **Vitest** (unit), **Playwright** (smoke) |
| `FROM cyrale/curvytron` | **`node:24-alpine`** multi-stage |
