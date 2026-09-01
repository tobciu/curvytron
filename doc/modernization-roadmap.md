# Modernization roadmap

## Why

Curvytron works but its toolchain is a decade old and actively blocks further development:

- **AngularJS 1.4.3** — end-of-life (no security patches).
- **Gulp 3 + Bower** — deprecated/unmaintained; `gulp-sass@0.7` (old libsass) will not
  build on a current Node. `npm install` runs `bower install` through a `scripts.install`
  hook and fails on modern npm.
- **No lockfile**, floating semver ranges → builds are not reproducible.
- **No module system** — source is concatenated into one IIFE with global symbols, which
  defeats IDE navigation, type-checking, tree-shaking, and per-file testing.
- **No tests, no CI.**

The aim is to reach a modern, reproducible, modular, testable codebase **without a big-bang
rewrite** and **without the game ever becoming unplayable**. The client shell **is** being
rewritten onto a new framework (AngularJS is EOL) — but incrementally, screen by screen,
behind the running app.

**Decisions taken:**

- Client framework → **Svelte 5 + TypeScript + Vite** — [ADR 0001](adr/0001-client-framework.md).
- WebSocket transport → migrate `faye-websocket` → **`ws`**, protocol unchanged —
  [ADR 0002](adr/0002-websocket-transport.md).
- Detailed client-rewrite steps → [`rewrite-plan.md`](rewrite-plan.md).
- Deployment target: CI-built Docker image, run via `docker compose` →
  [`deployment.md`](deployment.md).

Current-state reference (what must keep working): [`architecture.md`](architecture.md),
[`game-rules.md`](game-rules.md), [`protocol.md`](protocol.md), [`flows.md`](flows.md),
[`legacy-build-notes.md`](legacy-build-notes.md).

> **The revised, authoritative plan** — settled decisions, the relaxed "repo need not stay
> runnable mid-rebuild" constraint, and the revised phase order — lives in
> [`pre-implementation-checklist.md`](pre-implementation-checklist.md). The phase
> descriptions below are background; where they differ, the checklist wins.

### What gets modernized: client vs. server

| | Client (`src/client`, views) | Server (`src/server`) | Shared (`src/shared`) |
| --- | --- | --- | --- |
| Framework | **rewritten** AngularJS → Svelte 5 | none today, none added — architecture kept | n/a |
| Language/modules | ESM + TS (Phase 2) | ESM + TS (Phase 2) | ESM + TS, imported by both |
| Dependencies | drop `angular*`, `soundjs`, `tom32i-*` bower | `faye-websocket`→`ws`, Express 4→5, drop `usage`, influx client | — |
| Runtime | browser | Node 24 | both |
| Kept as-is | canvas renderer, client sim | pseudo-class model, custom WS protocol, `setTimeout` loop, `World` collision grid | all `Base*` logic |

So: **both are modernized** (tooling, module system, types, deps, Docker), but only the
**client** gets a new framework. The server's design is sound — it's just old syntax and
old libraries.

### Golden rule

> **At the end of every phase**, `build → start server → open browser → create room → play
> a round` must work. Intermediate commits/PRs need not boot (owner's call — see
> [`pre-implementation-checklist.md`](pre-implementation-checklist.md)); the Phase 0
> reference build is the fallback, not `gulp`.

## Guiding principles

- **Small, reversible PRs.** One concern each. Keep the legacy build working until its
  replacement is proven.
- **Behavior-preserving first.** Tooling/module/type changes before feature or framework
  changes.
- **Phases 1–3 are independent of the UI framework** and should land first: they make the
  engine importable and typed, which is what the Svelte rewrite (Phase 4) consumes. Phase 4
  folds Phase 1's build swap into its Step 0.
- **Use the MCP servers** for current docs before adopting/upgrading anything: `context7`
  (`resolve-library-id` → `query-docs`) for library docs, `deepwiki` for repo Q&A,
  `sonarqube` for quality baselines.

## Node pin

`.nvmrc` / `.node-version` pin **Node 24** (current LTS, support → Apr 2028). The legacy
build does **not** run on any normal Node — it only builds inside the `cyrale/curvytron`
Docker image (Node `v0.10.48`, with gulp 3 + `bower_components` baked in). See
[`legacy-build-notes.md`](legacy-build-notes.md). Everything new targets Node 24.

---

## Phase 0 — Capture a baseline

**Goal:** a known-good reference so later phases are verifiable.

- ✅ Legacy build/deploy documented — [`legacy-build-notes.md`](legacy-build-notes.md).
- ✅ Baseline screenshots in [`doc/images/`](images) (8 screens) — visual parity reference.
- ✅ Smoke-test procedure recorded (create room → player → one full round).
- **Extract the reference build** from the running `cyrale/curvytron` container
  (`gulp` inside it, `docker cp` the artifacts) into `doc/reference-build/`. This is the
  fallback the rest of the plan builds against, and the output contract Phase 1 reproduces.

**Risk:** none.

---

## Phase 1 — Build & dependency modernization (tooling only)

**Goal:** replace Gulp 3 + Bower with an npm-only, lockfile-backed, modern-Node build that
produces the **same output contract**. No framework change, server untouched.

- **Bower → npm.** Move `angular`, `angular-route`, `angular-cookies`,
  `angular-bootstrap-colorpicker`, `createjs-soundjs` and the `tom32i-*` helpers to
  `dependencies` (they exist on npm; vendor the one or two that don't into `vendor/`).
  Delete `bower.json`, `bower-resolutions.json`, the `scripts.install` hook.
- **Gulp 3 → a modern bundler in concat/IIFE mode.** Options:
  - **esbuild** (simplest): one script that globs the `recipes/*.json` file lists, bundles
    with `format: 'iife'`, writes `web/js/curvytron.js` + `web/js/dependencies.js` +
    `bin/curvytron.js`. Fast, tiny config.
  - **Vite** (library mode) if a dev server with HMR is wanted now.
  - Keep the exact same output paths/names so `web/index.html` and the server need no
    changes yet.
- **SASS:** `gulp-sass@0.7` → `sass` (Dart Sass) via the bundler or a standalone script →
  `web/css/style.css` (unchanged path).
- **HTML/views + GA injection:** reimplement the `ga` and `views` tasks as small scripts
  (or bundler plugins).
- **`package-lock.json`:** commit it. Add real `scripts`:
  `build`, `build:dev`, `dev` / `watch`, `lint`, `start`.
- **Lint:** JSHint → **ESLint** with rules translated from `.jshintrc`
  (`quotmark:single` → `quotes`, `eqeqeq`, `curly`, `camelcase`, 4-space `indent`,
  `no-undef` off for now given globals). Add `eslint-config` + `.eslintrc`. Keep
  `.jshintrc` until ESLint is green, then remove.
- **Dockerfile → multi-stage `node:24-alpine`** (build: `npm ci && npm run build`;
  runtime: non-root, `--omit=dev`, healthcheck), drop the opaque `cyrale/curvytron` base.
  `docker-compose.yml` switches from `build: .` to a pulled `image:`. Full target +
  Compose + CI image-push in [`deployment.md`](deployment.md).
- **`.editorconfig`** already added; wire `editorconfig-checker` into `lint` optionally.

**Deliverable check:** `npm ci && npm run build && node bin/curvytron.js` on Node 24
produces a working game; smoke test passes.

**Risk:** medium (build correctness).

---

## Phase 2 — Language & module modernization (incremental)

**Goal:** turn the concatenated globals into real ES modules; modern syntax; optional
type-checking. Still no UI framework change.

- Convert file-by-file: add `export` to each class, `import` its dependencies. The bundler
  from Phase 1 switches from "concat file list" to a real entry graph
  (`src/client/app.js`, `src/server/launcher.js`).
- `var` → `const`/`let`; drop the `es3` constraint; allow arrow functions, template
  literals, `class` (optionally migrate the `prototype`/`Object.create` pattern to
  `class ... extends`, mechanically, one hierarchy at a time — `Base*` + its two
  subclasses together).
- Make `src/shared/` an importable internal package (path alias `@shared` or a workspace
  package) consumed by both `src/client` and `src/server`.
- Optional but recommended: enable TypeScript in check-only mode (`allowJs`, `checkJs`,
  `strict` off initially), add `jsconfig.json`/`tsconfig.json`, then convert leaf modules
  to `.ts` opportunistically.
- Delete `stressTest.js`'s special-casing once modules exist (make it a real dev entry).

**Risk:** medium, but naturally chunked (one module/PR). **Playable:** yes throughout.

---

## Phase 3 — Runtime & backend dependencies

**Goal:** modern, supported server stack.

- **Express 4 → 5** (or evaluate a lighter static-file setup; Express is only used for
  `express.static('web')`).
- **`faye-websocket` → `ws`** ([ADR 0002](adr/0002-websocket-transport.md)). The custom
  batched protocol in `BaseSocketClient` is transport-agnostic, so this is a server-only
  change with the protocol framing untouched; do **not** pull in Socket.IO. Independent of
  Phase 4 — can land before or after.
- **`influx`** (Inspector): upgrade to a supported `@influxdata/influxdb-client` or gate
  the whole Inspector behind a clean optional plugin boundary.
- `optionalDependencies` `usage` (native, unmaintained) → replace with
  `process.resourceUsage()` / `os` metrics or drop.
- Set `"engines": { "node": ">=24" }` and CI matrix on current LTS lines.

**Risk:** low–medium. **Playable:** yes.

---

## Phase 4 — Client rewrite: AngularJS → Svelte + Vite

**Decided** ([ADR 0001](adr/0001-client-framework.md)): the AngularJS shell is replaced by
**Svelte 5 + TypeScript**, built with **Vite**, using Svelte stores as the socket-fed state
layer. Full step-by-step playbook: [`rewrite-plan.md`](rewrite-plan.md).

**Approach — incremental, not big-bang.** Migrate one screen per PR, deleting the matching
AngularJS controller/view as each replacement lands. `main` stays untouched; the
`modernize` branch is verified **at the end of each phase**, not every commit (owner's
call — see [`pre-implementation-checklist.md`](pre-implementation-checklist.md)). This is
the fix for why `origin/ai_migrate` (a parallel React + socket.io rewrite that also never
migrated the server) stalled — the difference is here the server + shared code are
modernized *first* (Phase 1) and each phase is independently checkable.

**What is reused, not rewritten:** `src/shared/**`, `src/client/core/*`,
`src/client/model/*`, `src/client/animation/*` — the canvas renderer, client-side
simulation and the `BaseSocketClient` protocol. They are converted to ESM/TS in Phase 2 and
imported by Svelte components. The canvas never goes through Svelte's reactivity.

**Steps (condensed — see `rewrite-plan.md`):**

0. Vite + Svelte scaffold; port the SASS + GA-injection Gulp tasks; keep `gulp` as fallback.
1. Make the engine importable (ESM/TS) + swap `tom32i-*` Bower libs for npm.
2. Socket layer: a **typed event map** (from [`protocol.md`](protocol.md)),
   a `request()` promise wrapper, and Svelte stores replacing the `*Repository` services.
3. `App.svelte` shell + hash routing matching today's routes.
4. Migrate screens one PR each: About → Rooms list → Profile → Room/lobby → Game HUD;
   delete each AngularJS controller/view as its replacement goes live.
5. `Game.svelte` mounts the existing canvas renderer in `onMount`; HUD reads the `game`
   store, renderer consumes socket events directly.
6. Replace `angular-bootstrap-colorpicker`, `createjs-soundjs`, `angular-cookies`.
7. Delete `gulpfile.js`, `bower.json`, AngularJS, ported controllers/views; modern
   `Dockerfile`; update docs.

**Risk:** L (many small PRs, but each is revertible and smoke-tested).
**Playable:** yes after every step.

---

## Phase 5 — Quality & automation

**Goal:** lock in the gains.

- **Tests:** add [Vitest](https://vitest.dev/) (or the Node built-in test runner).
  Start with `src/shared/` (pure logic: scoring, collision math, `Collection`,
  `BaseSocketClient` framing) — highest value, no DOM needed.
- **CI:** GitHub Actions — `lint` + `build` + `test` on push/PR; cache `npm ci`. On
  merge/tag, **build and push the Docker image** to a registry (GHCR) — see
  [`deployment.md`](deployment.md).
- **SonarQube:** wire up the empty `.sonar/` (there is a `sonarqube` MCP available);
  add `sonar-project.properties`, gate PRs on the quality gate.
- **Dependabot / renovate** for ongoing dependency hygiene.
- Optional: a headless smoke test (Playwright) that automates the 2-player round so the
  golden rule is machine-checked.

---

## Suggested order & rough sizing

| Phase | Blocking? | Effort | Ship-in-pieces? |
| --- | --- | --- | --- |
| 0 Baseline | prerequisite | XS | n/a |
| 1 Build/deps | **yes** — unblocks everything | M | yes |
| 2 Modules/syntax | high value | M–L | yes (per module) |
| 3 Runtime deps | medium | S–M | yes |
| 4 Rewrite (Svelte) | committed | L (many small PRs) | yes — screen by screen |
| 5 Quality/CI | do parts early | S–M | yes |

Phase 1 is the single highest-leverage step: it makes the repo buildable on a normal
machine and enables everything after it. Phase 4's detailed playbook — including how its
Step 0 subsumes Phase 1 — is in [`rewrite-plan.md`](rewrite-plan.md).
