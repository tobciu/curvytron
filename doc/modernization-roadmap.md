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
rewrite** and **without the game ever becoming unplayable**.

### Golden rule

> After every phase (ideally every PR), `build → start server → open browser → create room
> → play a round with 2 local players` must still work.

## Guiding principles

- **Small, reversible PRs.** One concern each. Keep the legacy build working until its
  replacement is proven.
- **Behavior-preserving first.** Tooling/module/type changes before feature or framework
  changes.
- **Phases 1–3 are independent of the eventual UI direction** — do them first; defer the
  Angular-vs-rewrite decision (Phase 4) until the code is modular enough to estimate it
  honestly.
- **Use the MCP servers** for current docs before adopting/upgrading anything: `context7`
  (`resolve-library-id` → `query-docs`) for library docs, `deepwiki` for repo Q&A,
  `sonarqube` for quality baselines.

## Interim Node pin

`.nvmrc` / `.node-version` pin **Node 20** — the target we build *towards*. Until Phase 1
lands, the **legacy `gulp` build still needs an old Node (~8–10)**; run it under `nvm` in a
throwaway shell. The runtime server (`node bin/curvytron.js`) already runs fine on Node 20.

---

## Phase 0 — Capture a baseline

**Goal:** a known-good reference so later phases are verifiable.

- Document the exact steps + Node version that currently produce a working build (in a
  scratch `doc/legacy-build-notes.md` or a pinned issue).
- Record a smoke-test procedure (2 local players, one full round) and, ideally, a short
  screen capture / screenshots.
- Snapshot the produced `web/js/curvytron.js` / `bin/curvytron.js` sizes and the
  `gulp jshint` output for later comparison.

**Risk:** none. **Playable:** yes (unchanged).

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
- **Dockerfile:** `FROM node:20-alpine`, multi-stage (build stage runs `npm ci && npm run
  build`, runtime stage copies `web/` + `bin/`), drop the opaque `cyrale/curvytron` base.
- **`.editorconfig`** already added; wire `editorconfig-checker` into `lint` optionally.

**Deliverable check:** `npm ci && npm run build && node bin/curvytron.js` on Node 20
produces a byte-for-byte-equivalent-*enough* game; smoke test passes.

**Risk:** medium (build correctness). **Playable:** yes, after each sub-step.

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
- **`faye-websocket`**: decide keep vs. migrate to [`ws`](https://github.com/websockets/ws).
  The custom batched protocol in `BaseSocketClient` is transport-agnostic, so `ws` is a
  low-risk swap; do **not** pull in Socket.IO (different framing, would need a protocol
  rewrite). Document the decision as an ADR.
- **`influx`** (Inspector): upgrade to a supported `@influxdata/influxdb-client` or gate
  the whole Inspector behind a clean optional plugin boundary.
- `optionalDependencies` `usage` (native, unmaintained) → replace with
  `process.resourceUsage()` / `os` metrics or drop.
- Set `"engines": { "node": ">=20" }` and CI matrix on current LTS lines.

**Risk:** low–medium. **Playable:** yes.

---

## Phase 4 — Client framework: decision point

By now the code is modular and typed, so the effort of each option is estimable. **Both
options keep the server and the wire protocol as-is initially.**

### Option A — Keep, then gradually retire AngularJS

- Bump **AngularJS 1.4.3 → 1.8.x** (final release, has some security backports) as a
  stepping stone.
- Extract UI pieces (room list, room detail, chat, profile, in-game HUD) one at a time
  into **framework-agnostic Web Components** (or a tiny view lib), leaving Angular as a
  shrinking shell until it can be deleted.
- The renderer and client-side simulation are already framework-free — untouched.

**Pros:** always shippable; smallest blast radius; shared logic untouched; no parallel
"new app" to keep in sync.
**Cons:** two paradigms coexist for a long time; slower to a "clean" end state; Web
Components tooling is less batteries-included than a full framework.

### Option B — Rewrite the client shell on a modern framework (e.g. React + Vite)

- New **React + Vite** app for routing, lobby, rooms, chat, profile, results.
- The game `<canvas>` becomes one isolated component wrapping the existing (now modular)
  renderer + client sim; the WS layer (`SocketClient` + repositories) is reused as plain
  modules behind a context/hook.
- Server-side game logic and protocol stay put; modernize them later on their own track.

**Pros:** clean target stack, large ecosystem, best long-term DX and hiring story.
**Cons:** biggest, riskiest step. A prior one-shot AI attempt at exactly this
(`origin/ai_migrate`, React 19 + Vite + socket.io) stalled because the **server
counterpart was never migrated** and the game wouldn't start — treat that as the cautionary
tale: do it *incrementally behind the working app*, screen by screen, with the smoke test
gating each merge, not as a parallel rewrite.

### Recommendation

Do **Phases 1–3 first** regardless. Then, if the team wants a mainstream framework and has
the bandwidth for a multi-PR migration, choose **B but executed incrementally** (new
framework mounted alongside the old shell, routes moved one by one). If bandwidth is
limited or "always green" matters more than reaching a pure end state, choose **A**.
Record the choice as an ADR under `doc/adr/`.

---

## Phase 5 — Quality & automation

**Goal:** lock in the gains.

- **Tests:** add [Vitest](https://vitest.dev/) (or the Node built-in test runner).
  Start with `src/shared/` (pure logic: scoring, collision math, `Collection`,
  `BaseSocketClient` framing) — highest value, no DOM needed.
- **CI:** GitHub Actions — `lint` + `build` + `test` on push/PR; cache `npm ci`.
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
| 4 Framework | optional / strategic | L (A) – XL (B) | yes if incremental |
| 5 Quality/CI | do parts early | S–M | yes |

Phase 1 is the single highest-leverage step: it makes the repo buildable on a normal
machine and enables everything after it.
