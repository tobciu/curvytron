Curvytron
=========

A web multiplayer *Tron*-like game... **with curves!** Up to dozens of players share a
room, steer a constantly-moving curve with two keys (or a gamepad / touch), try not to
crash into a trail, and grab bonuses that speed up, shrink, invert or otherwise mess with
everyone. Server-authoritative, real-time, runs in any modern browser on a `<canvas>`.

This repository is a fork of the original [Elao/curvytron](https://github.com/Elao/curvytron).
The code still works but is frozen on 2015-era tooling — see
[Project status](#project-status) and the
[Modernization roadmap](doc/modernization-roadmap.md).

![Curvytron in play — curved trails and bonuses on the arena](doc/images/game-with-trail-and-bonus.png)

---

## Table of contents

- [Gameplay](#gameplay)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Architecture at a glance](#architecture-at-a-glance)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Build & dev commands](#build--dev-commands)
- [Project status](#project-status)
- [Documentation](#documentation)
- [License & credits](#license--credits)

---

## Gameplay

- Create or join a **room**, pick a name and a color (one browser tab can register
  **several local players** sharing one keyboard).
- Every player controls one **avatar**: it moves forward on its own; you only press
  *left* / *right*. The avatar leaves a solid **trail** (with periodic gaps).
- Touching any trail, the arena border (unless *borderless*), or another avatar kills you.
- **Bonuses** pop on the map: self / enemy / leader / game-wide effects
  (small, fast, slow, big, inverse, master, borderless, clear, colour swap, ...).
- First to the room's **max score** wins the game; each round awards points for surviving
  and for every opponent that died before you.

## Screenshots

| | |
| --- | --- |
| [Rooms overview](doc/images/rooms-overview.png) | [Room / lobby](doc/images/lobby.png) |
| [Room config (master)](doc/images/lobby-with-config-panel.png) | [Profile panel](doc/images/my-profile.png) |
| [Round countdown](doc/images/game-start-with-countdown.png) | [In play — trails + bonuses](doc/images/game-with-trail-and-bonus.png) |
| [Round won](doc/images/game-over-round-won.png) | [Final scoreboard](doc/images/game-end-score-board.png) |

These are the **visual baseline** for the [Svelte rewrite](doc/rewrite-plan.md) — each
screen must match before it is redesigned.

## Tech stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Server runtime | **Node.js**, [Express 4](https://expressjs.com/) (static file serving) | Entry: generated `bin/curvytron.js` |
| Realtime transport | [`faye-websocket`](https://github.com/faye/faye-websocket-node) | Raw WebSocket + a **custom batched JSON protocol**, *not* Socket.IO |
| Client framework | **AngularJS 1.4.3** (EOL) + `angular-route`, `angular-cookies`, `angular-bootstrap-colorpicker` | Routing, lobby, chat, profile UI |
| Rendering | Plain `<canvas>` 2D | Framework-independent game loop |
| Sound | [`createjs-soundjs`](https://www.createjs.com/soundjs) | |
| Input | `tom32i-gamepad.js`, `tom32i-key-mapper.js` (+ other `tom32i-*` helpers) | Keyboard / gamepad / touch |
| Build | **Gulp 3** + **Bower**, `gulp-sass` (libsass), `gulp-uglify`, JSHint | Concatenates every source file into one IIFE bundle |
| Optional metrics | [`influx`](https://github.com/node-influx/node-influx) (InfluxDB "Inspector"), `usage`, `MD5` | `optionalDependencies` |
| Container | `Dockerfile` (base image `cyrale/curvytron`) + `docker-compose.yml` | |

## Architecture at a glance

```
                 browser                              node.js
        ┌───────────────────────┐            ┌────────────────────────┐
        │ AngularJS lobby / UI  │            │ Express (static /web)  │
        │ Canvas 2D renderer    │  WebSocket │ Server / SocketClient  │
        │ client game loop      │◄──────────►│ RoomRepository / Rooms │
        │ SocketClient          │  batched   │ Room → GameController   │
        │                       │  JSON      │ Game loop (setTimeout)  │
        └───────────────────────┘  events    │ World grid (Islands)    │
                                             └────────────────────────┘
```

Three source trees under `src/`:

- **`src/shared/`** — `Base*` "pseudo-classes" (constructor function + `prototype`
  methods, no `class` keyword). They hold logic that must behave identically on both
  sides: `BaseGame`, `BaseAvatar`, `BaseTrail`, `BaseRoom`, `BaseRoomConfig`,
  `BaseBonus*`, `BaseSocketClient` (the wire protocol), `Collection`, ...
- **`src/client/`** — extends the shared classes (`Game`, `Avatar`, ...) with
  browser concerns (rendering, sound, DOM), plus AngularJS controllers/services in
  `src/client/controller` and `src/client/service`, wired up in
  [`src/client/app.js`](src/client/app.js).
- **`src/server/`** — extends the same shared classes with authoritative simulation:
  collision detection via a spatial grid (`World` → `Island` → `AvatarBody`/`Body`),
  the fixed-timestep game loop (`BaseGame.loop`, `framerate = 1000/60`, driven by
  `setTimeout`), room/roomlist controllers, bonus manager, and the trackers/inspector.

**No module system.** The build simply concatenates files (order defined by
[`recipes/client.json`](recipes/client.json) / [`recipes/server.json`](recipes/server.json))
and wraps the result in one `(function(){ "use strict"; ... })()`. Every class is a
**global symbol** inside that IIFE; there are no `require`/`import` statements in `src/`
(the server's only real `require`s live in
[`src/server/dependencies.js`](src/server/dependencies.js)).

**Wire protocol.** [`BaseSocketClient`](src/shared/core/BaseSocketClient.js) batches
outgoing events into a JSON array `[[name, data, callbackId?], ...]` and flushes them on
an interval; numeric first elements are RPC-style callback replies. Client and server
share this exact file.

See [`doc/architecture.md`](doc/architecture.md) for the full request/round lifecycle.

## Repository layout

```
src/
  shared/        Base* classes shared by client and server
  client/        Browser app: AngularJS controllers/services + canvas game code
    app.js       Angular module bootstrap + routes
    core/        Canvas, SocketClient, StopWatch
    controller/  Route + in-game UI controllers
    service/     Profile, Chat, SoundManager, Notifier, Radio, ...
    model/       Client-side Game/Avatar/Room/... + bonus + preset models
    views/       HTML templates (index.html is the app shell)
  server/        Node app
    launcher.js  Builds the Server from config.json
    core/        Server, SocketClient, World, Island, Body, Inspector, PingLogger
    controller/  RoomsController, RoomController, GameController
    model/       Server Game/Avatar/Room/... + model/Bonus/* (all bonus types)
    manager/     BonusManager, KickManager, PrintManager
    trackers/    InfluxDB game/room/client trackers
  sass/          Stylesheets (compiled to web/css/style.css)
recipes/         File globs + output names for the two bundles
gulpfile.js      Build tasks
web/             Static assets + build output (js/, css/, index.html are generated)
doc/             Documentation (this file links into it)
config.json.sample   Copy to config.json to configure
Dockerfile / docker-compose.yml
```

## Getting started

> ⚠️ **The legacy build cannot be reproduced on a normal machine.** Its toolchain
> (`gulp@3`, `gulp-sass@0.7`/old libsass, `bower_components`) exists **only inside the
> `cyrale/curvytron` Docker image** (Node `v0.10.48`), which this repo's `Dockerfile`
> builds `FROM`. The dependency versions are no longer resolvable standalone. Full details:
> [`doc/legacy-build-notes.md`](doc/legacy-build-notes.md). Replacing this is
> [Phase 1 of the roadmap](doc/modernization-roadmap.md).

### Docker (the only supported path today)

```bash
docker compose up --build
```

Serves on <http://localhost:8080/>. The image is `FROM cyrale/curvytron`, copies `src/` in
and runs `gulp` inside it. A modern multi-stage `node:24-alpine` replacement is
[planned](doc/deployment.md).

Then open <http://localhost:8080/>, pick a name, create a room, and play.

## Configuration

Copy the sample and edit:

```bash
cp config.json.sample config.json
```

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `port` | Number | `8080` | HTTP + WebSocket port |
| `googleAnalyticsId` | String \| null | `null` | Injected into `index.html` at build time by the `ga` task |
| `inspector.enabled` | Boolean | `false` | Enable the InfluxDB metrics inspector |
| `inspector.host` / `port` / `username` / `password` / `database` | — | `localhost` / — / `curvytron` / `curvytron` / `curvytron` | InfluxDB connection for the inspector |

`config.json` is git-ignored. Full reference: [`doc/configuration.md`](doc/configuration.md).

## Build & dev commands

Defined in [`gulpfile.js`](gulpfile.js):

| Command | What it does |
| --- | --- |
| `gulp` (`default`) | Full production build: `jshint`, server bundle, front deps, minified `index.html`, views, minified JS + CSS |
| `gulp dev` | Same but unminified, plus the stress-test script |
| `gulp watch` | `dev` build + rebuild on changes to `src/**` |
| `gulp jshint` | Lint `src/**/*.js` against [`.jshintrc`](.jshintrc) (ES3, single quotes, 4-space indent) |
| `node bin/curvytron.js` | Run the built server |

Build outputs (`web/js/`, `web/css/`, `web/index.html`, `bin/`) are **generated** and
git-ignored — always rebuild after pulling.

**Stress test:** in the browser console, load `js/stressTest.js` — it creates a room,
adds 150 players and starts a game (details in [`doc/dev.md`](doc/dev.md)).

## Project status

Curvytron is **feature-complete and playable** but unmaintained upstream since ~2018 and
technically stalled:

- AngularJS 1.4 is end-of-life; Gulp 3 and Bower are deprecated and unmaintained.
- No dependency lockfile; floating version ranges; build breaks on modern Node.
- Source uses no modules (global symbols in one concatenated IIFE), which blocks IDE
  tooling, tree-shaking and incremental refactoring.
- No automated tests, no CI.

The goal of this fork is to **modernize incrementally without ever breaking the game**.
The phased plan is in [`doc/modernization-roadmap.md`](doc/modernization-roadmap.md).
Decisions taken so far: the AngularJS shell is being rewritten to **Svelte 5 + TypeScript +
Vite** ([ADR 0001](doc/adr/0001-client-framework.md)), screen by screen behind the running
app ([`doc/rewrite-plan.md`](doc/rewrite-plan.md)); the server WebSocket moves from
`faye-websocket` to `ws` with the protocol unchanged ([ADR 0002](doc/adr/0002-websocket-transport.md)).
Contributor-facing notes live in [`CLAUDE.md`](CLAUDE.md).

## Documentation

| Doc | Contents |
| --- | --- |
| [`doc/architecture.md`](doc/architecture.md) | Full architecture: connection → room → round lifecycle, server core objects, client wiring, bundle mapping |
| [`doc/game-rules.md`](doc/game-rules.md) | Movement/turn physics, trail & printing, collision & death, scoring, rounds, map sizing, the bonus system + catalogue, all constants |
| [`doc/protocol.md`](doc/protocol.md) | The WebSocket protocol: framing, batching, compression, handshake, full event reference (lobby / room / game) |
| [`doc/flows.md`](doc/flows.md) | Sequence diagrams: connect, create/join room, lobby config & launch, round lifecycle, spectate, leave/close |
| [`doc/assets.md`](doc/assets.md) | Static-asset inventory: bonus sprite sheet, sounds, icon font, images |
| [`doc/dependency-map.md`](doc/dependency-map.md) | Every legacy dependency → npm / vendor / dropped |
| [`doc/pre-implementation-checklist.md`](doc/pre-implementation-checklist.md) | **Authoritative plan**: settled decisions, revised phase order, what's still to capture, test strategy |
| [`doc/modernization-roadmap.md`](doc/modernization-roadmap.md) | Phased modernization plan (background; checklist wins on conflicts) |
| [`doc/legacy-build-notes.md`](doc/legacy-build-notes.md) | How the frozen build + deploy work today; reference-build extraction |
| [`doc/rewrite-plan.md`](doc/rewrite-plan.md) | Step-by-step client rewrite playbook (AngularJS → Svelte + Vite) |
| [`doc/deployment.md`](doc/deployment.md) | Target Docker image (multi-stage) + `docker compose` deploy + CI image build |
| [`doc/adr/`](doc/adr) | Architecture Decision Records (0001 framework, 0002 transport) |
| [`doc/installation.md`](doc/installation.md) | Original install instructions |
| [`doc/dev.md`](doc/dev.md) | Dev environment, watch build, stress test |
| [`doc/configuration.md`](doc/configuration.md) | `config.json` reference |
| [`doc/contribution.md`](doc/contribution.md) | How to contribute (upstream) |
| [`doc/nginx-proxy.md`](doc/nginx-proxy.md) | Reverse-proxy setup |
| [`CLAUDE.md`](CLAUDE.md) | Working notes for automated/AI-assisted contributors |

## License & credits

MIT — see [`LICENSE`](LICENSE). Originally handmade at [Elao](http://www.elao.com) by
Thomas Jarrand and Johan Dufour; inspired by *Curve Fever*. Full credits in
[`humans.txt`](humans.txt).
