# Pre-implementation checklist

What must be settled or captured before the first modernization PR. Companion to
[`modernization-roadmap.md`](modernization-roadmap.md) and
[`rewrite-plan.md`](rewrite-plan.md).

## Constraint change: the repo need NOT stay runnable mid-rebuild

Earlier docs said "playable at every commit / keep AngularJS working in parallel". The
owner has relaxed this: **the intermediate repo does not have to boot** — only each
*phase* must end in a verifiable state, and the final result must work. Consequences:

- **No strangler.** AngularJS files are deleted as their Svelte replacements land, not kept
  alive alongside.
- **Bower is dropped immediately** in Phase 1 — no npm-shim transition for the Angular-era
  libs.
- **No `gulp` fallback.** The Phase 0 *reference build* (extracted artifacts) is the safety
  net instead.
- Verification moves from "every commit" to "end of each phase" (see per-phase checks).

## Decisions (settled)

| Topic | Decision | Notes |
| --- | --- | --- |
| Client framework | **Svelte 5 + TypeScript** | [ADR 0001](adr/0001-client-framework.md) |
| Transport | **`ws`**, protocol framing unchanged | [ADR 0002](adr/0002-websocket-transport.md) |
| Node | **24 LTS** (`.nvmrc`/`.node-version` → `24`, `engines.node >= 24`), Docker `node:24-alpine` | current LTS, support → Apr 2028; bump to 26 later is trivial |
| Package manager | **npm** + committed `package-lock.json` | least-surprising; the whole pain here is exotic tooling |
| Repo layout | single `package.json`; TS path alias `@shared` → `src/shared`; `src/{shared,server,client}` | promote to a workspace only if it grows |
| `EventEmitter` | **`eventemitter3`** (npm), imported in every `Base*` class | works Node + browser, no polyfill; API-compatible (`on`/`off`/`emit`/`removeListener`) |
| Server deps → ESM | `express` 5, `ws`, `node:http`; **drop `usage`** (→ `process.resourceUsage()`/`os`), **drop `MD5`** (→ `node:crypto`), keep `influx` but upgrade to `@influxdata/influxdb-client`, dynamic-`import()`ed only when `inspector.enabled` | `src/server/dependencies.js` deleted; no more `try/catch require` |
| Config | keep `config.json`; **also** read env (`PORT`, `GA_ID`, `INSPECTOR_*`) with env taking precedence | GA token becomes runtime (injected by the server / a tiny Vite plugin), not build-time |
| Build outputs | client → `dist/` (Vite), server → `dist-server/` (esbuild/tsx bundle or plain tsc) | server `express.static('dist')` + SPA fallback |
| Golden rule | end-of-phase verification, not per-commit | see below |

## Revised phase order

| Phase | Goal | End-of-phase verification |
| --- | --- | --- |
| **0 — Reference capture** | Extract the frozen-toolchain build; document legacy build/deploy | artifacts in `doc/reference-build/`; [`legacy-build-notes.md`](legacy-build-notes.md) filled in |
| **1 — Server + shared → ESM/TS on Node 24** | New `package.json`; convert `src/shared/**` + `src/server/**`; `faye`→`ws`; drop `usage`/`MD5`; delete `dependencies.js`, Bower | `node dist-server/main.js` on Node 24 serves the **reference-build client**; create room + 1 player + play a round manually; `npm test` (Vitest on `src/shared`) green |
| **2 — Svelte client** | Vite + Svelte 5; typed socket layer + event map; stores; migrate screens vs. the 8 screenshots; delete AngularJS; responsive game view | each screen matches its screenshot; full round with 2 local players + a spectator tab; Playwright smoke green; no console errors; ~60 fps |
| **3 — Docker + Compose + CI** | Multi-stage `node:24-alpine` image; compose pulls image; GH Actions builds+pushes on merge/tag | `docker compose up --build` → play a round in-container; registry pull path works |
| **4 — Quality hardening** | Widen Vitest coverage; SonarQube; Dependabot; TS `strict` on | CI gates: lint + test + Playwright smoke on every PR |

## Still to capture (research — no decisions blocked, but needed early)

- [ ] **Dependency map, Bower → npm/vendor** — for each of the 10 Bower deps: npm name +
  version, or "vendor to `vendor/`", or "dropped (Svelte replaces it)". Priority:
  `tom32i-event-emitter` (→ `eventemitter3`, decided), `tom32i-gamepad` + `tom32i-key-mapper`
  (input — npm? vendor? small rewrite?), `tom32i-option-resolver` (used by shared models),
  `tom32i-asset-loader` (bonus sprite / sounds), `createjs-soundjs` (→ Web Audio / `howler`),
  `angular*` + `angular-bootstrap-colorpicker` (dropped with the rewrite).
- [ ] **Exhaustive typed protocol** — grep every `addEvent(`/`.on(` on **both** sides
  (server side already verified — 50 events, matches [`protocol.md`](protocol.md)); do the
  client side) → a complete event table with payload types, as the spec for
  `lib/socket/events.ts`.
- [ ] **Real output contract** — the `<script>`/`<link>` tags in the produced
  `web/index.html`; confirm nothing beyond the 6 outputs is needed (verify against the
  deployed site's HTML).
- [ ] **Asset & icon inventory** — how `web/images/bonus.png` is sliced (`BonusManager` /
  `tom32i-asset-loader`); the `web/sounds/*` mp3+ogg pairs and their trigger points;
  `web/font/curvytron.*` — list the `icon-*` glyphs actually used in the templates (keep
  the icon font, or replace with inline SVG?).
- [ ] **`config.json` on the deployed box** — is one mounted? what values? (drives the
  env-var fallback design).

## Testing strategy (resolves checklist item #8)

Automated play is hard because the game wants live input — but it is **not** a dead end.
Two layers plus a human gate:

1. **Vitest on `src/shared`** — where gameplay *correctness* is tested; no browser, no
   input. Targets: `Compressor` round-trip, `Collection`, `BaseAvatar` math
   (`updateVelocities`, `updateAngle`, speed↔turn coupling, `getDistance`), `BaseTrail`,
   scoring (`addScore`/`resolveScore`/`resolveScores`), `BaseSocketClient` framing
   (encode/decode a batch, numeric-vs-string dispatch, callback ids), `BaseRoomConfig`
   toggles, `BaseGame.getSize`. **This is the real safety net.**
2. **Playwright smoke test** — Playwright *can* send real key events
   (`page.keyboard.down('ArrowRight')`), so it can drive a 1-player game (`minPlayer = 1`).
   Scope = **flow + connectivity + rendering**, not skill:
   - page loads, zero console errors, WebSocket connects (`whoami` resolves)
   - create room → add 1 player → *Start now* → `game:start` observed
   - hold a turn key ~1 s → assert the avatar's `angle`/position changed (via a small
     `window.__curvytron_debug` hook added in dev builds, or by diffing `#game`
     `canvas.toDataURL()` between two samples)
   - round completes → scoreboard renders → *Back to the room* works
   It will **not** assert collision/bonus correctness — that's layer 1.
3. **Manual + screenshot parity** — final human sign-off per screen against the 8
   baselines in `doc/images/`.

**Definition of done per PR:** `npm run lint` + `npm test` green; for a screen PR also
Playwright smoke green + a manual check against the screenshot.
