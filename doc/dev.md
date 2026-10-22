# Development

## Structure

    src
     |- shared  # Base classes that are extended by their equivalent on client and server side
     |- client  # Front-end (Vue 3 + TypeScript, bundled by Vite)
     |- server  # Back-end (Node.js, WebSocket server), TypeScript run directly by Node >= 22.18
    public      # Static assets (images, fonts, sounds) copied as is to the build
    assets      # Sources of the bonus images: `npm run sprite` builds public/images/bonus.png from them
    tools       # Scripts: sprite builder, load test
    tests       # Vitest unit / integration tests and Playwright end-to-end tests

### Client

    src/client
     |- main.ts, App.vue, router.ts   # Entry point, root component and routes (hash urls: #/room/name)
     |- views/                        # One component per page: rooms list, room, game, about
     |- components/                   # Profile panel, chat, room parameters, color picker, game widgets
     |- composables/                  # Bridge between the game model and Vue
     |- services.ts                   # Creates the services (socket, profile, chat...) and provides them to the components
     |- styles/                       # SCSS, imported by main.ts
     |- core, model, repository,      # The game itself: TypeScript classes (socket client, canvas rendering,
        service, manager, animation   # rooms, games, avatars...), not tied to Vue
     |- lib                           # Small libraries (plain JavaScript): gamepad, key mapper, sprite loader

The model is made of mutable objects that emit events. Vue can not see changes in them, so components use
`useLive(model, emitter, events)` (see `composables/useEmitter.ts`): the returned ref makes the template render again
each time one of the events is emitted (or `bump()` is called).
`types.ts` re-exports the model classes as types for the components.

### The network protocol

`src/shared/protocol.ts` lists every event with its data: `ClientEvents` (what the client sends, with the answer of the
server) and `ServerEvents` (what the server sends). The socket clients and groups are typed with them, so a wrong event
name or data is a type error on both sides. Add the event there first. `tests/quality.test.js` makes sure that the
number of explicit `any` only goes down (lower `maxExplicitAny` when you remove some).

### Data of the clients

The server does not trust the clients. The handlers check the shape of the data with `src/server/core/validate.ts`
(`isShape(data, { name: rules.string() })`) and answer `{ success: false, error: 'Invalid data.' }` when it is wrong.
An event whose handler fails anyway is logged and counted in `curvytron_event_errors_total`; it never stops the server.
Limits (all in the code, as constants): messages of 64 KiB (`Server.ts`), 60 events per second with bursts of 120, and a
client that goes on is disconnected (`eventLimit` in `SocketClient.ts`, counted in `curvytron_events_dropped_total`),
16 players per client and 64 per room (`RoomController.ts`), 500 rooms (`RoomRepository.ts`).

### Load test

`npm run load-test -- --rooms 6 --players 8 --duration 30` starts a server, plays that many games with simulated
clients that steer at random, then reads `/metrics` and prints the duration of a frame, the time between frames, the
ping, memory and CPU. `--url http://host:8080` (and `--token`) tests a server that is already running. As a reference,
6 rooms of 8 players (48 avatars) need about 0.1 ms per frame on a laptop, a frame lasts 16.7 ms.

### Game statistics

`src/server/service/GameStats.ts` listens to the events of a game (deaths, bonus catches, positions, end of round) and
counts what each player did (including what is around the avatar, looked at once per frame: near misses = a foreign trail closer than half an avatar radius, squeezes = foreign trails on both sides, nothing of it while the avatar is invincible). The server sends the result with the `game:stats` event at the end of every round (so the last one is the final result); the type
of the data is in `src/shared/model/GameStats.ts`. The client keeps the last one in `game.stats` and shows it with the
final ranking, after the last round only (`components/game/GameStats.vue`). The data is plain JSON, so it can be stored later.

### Reconnection and late join

A browser is recognized by a `token` (in `localStorage`, so it survives a closed tab) and a `tab` (in `sessionStorage`,
so a reload keeps it and a second tab does not); the client sends both in the query of the websocket url
(`src/client/core/session.ts`). The server keeps the `SocketClient` of a client whose connection dropped while it plays
a game (`SocketClient.suspend()`, decided by `RoomController.canSuspend()`) and gives it the new socket when the same
browser connects again (`Server.findSession()`, `SocketClient.resume()`): the client keeps its id, its room and its players.
The client reconnects by itself (`SocketClient.reconnect()`, with a heartbeat to notice a connection that died silently)
and reloads the page when it is back, so that room and game are built again from the server (`room:join` brings the
client back to its room, then `room:game:start` and `ready` as for a spectator).

Until it is back, the client is `away`: its players stay in the game (`player:connection` tells the others). Who takes part
in a round is decided between two rounds (`Game.syncPresence()`: in the room, not away): the others sit out, with their score
(`game:leave`), and come back with `game:join`. The avatar of a connection that dropped goes on until it dies. When the game
is over, the players that did not come back leave the room. Players that are added while a game runs (`Game.addPlayer()`)
join the same way, with a score of zero. Clients without a token behave as before: they leave the game when the connection drops.

### Defaults and constants

Default values are class fields (`duration = 4000;`). Constants that are read from outside of the class are `static`
(`Player.maxLength`, `BonusSelfFast.probability`, `BaseAvatar.defaults`). A subclass can override a field, but the
constructor of the base class does not see the override: read it later (methods, not constructor).

### Shared

The shared classes can not reference client or server classes directly: they call factory methods
(`createTrail()`, `createGame()`, ...) that are implemented on each side.

`#event-emitter` is resolved to Node's `EventEmitter` on the server and to `src/client/EventEmitter.ts` in the browser.
On the client, listeners receive a DOM-like event (`{ type, detail }`).

### TypeScript

All of `src` is written in strict TypeScript (`noImplicitOverride` too: a method that overrides another needs `override`). Node (>= 22.18) strips the types at runtime, so there is
no build step for the server (`node src/server/launcher.ts`). This limits the syntax to what can simply be erased:
relative imports end with `.ts`, no enums / namespaces / constructor parameter properties, and a subclass that only
narrows the type of an inherited field uses `declare` (a plain redeclaration would reset the value set by the base class).
`npm run typecheck` checks everything.

## Commands

| Command                      | Description                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                | Start the server with the Vite dev server (hot reload) on port 8080          |
| `npm run build`              | Build the client into `dist/`                                                |
| `npm start`                  | Start the server and serve the built client                                  |
| `npm test`                   | Run the unit and integration tests (Vitest)                                  |
| `npm run sprite`             | Build the sprite of the bonuses from `assets/bonuses/` (see `bonuses.md`)    |
| `npm run load-test`          | Play games with simulated clients and print what the metrics say (see below) |
| `npm run test:coverage`      | Run the tests and write the lcov coverage report for SonarQube (see below)   |
| `npm run test:e2e`           | Build, then run the browser tests (Playwright)                               |
| `npm run test:visual`        | Build, then compare screenshots of the main screens                          |
| `npm run test:visual:update` | Update the reference screenshots (after an intended design change)           |
| `npm run lint`               | Lint the sources (ESLint)                                                    |
| `npm run typecheck`          | Check the types of the `.ts` and `.vue` files                                |
| `npm run format`             | Format the sources with Prettier                                             |

### Tests

    tests
     |- game/    # Game rules on the server side: avatars, world and collisions, bonuses, rounds, rooms, votes
     |- client/  # Client side model (profile, chat, presets), runs in jsdom with the browser event emitter
     |- e2e/     # Playwright: real browsers against a real server, plus screenshot comparisons
     |- *.test.* # Shared code, protocol (real WebSocket server) and color maths

The first time, install the browser used by the end-to-end tests with `npx playwright install chromium`
(or set `CHROMIUM_PATH` to an existing Chromium / Chrome executable).

## Before a pull request

`tools/pre-pr-check.sh` runs everything the CI would check, plus security scans and a SonarQube analysis,
so red CI rounds do not happen in the first place: main integrated and pull request mergeable, conflict
markers, gitleaks, actionlint, compose, hadolint/shellcheck/Trivy/Semgrep (Docker images, no CI minutes),
Prettier, ESLint, typecheck, Vitest with coverage, build, functional Playwright tests and the Docker build.

The SonarQube scan (project `curvytron` on the self-hosted server) needs `SONAR_TOKEN` (browse and
"Execute Analysis") in the environment or in `~/.config/sonar-token`. It always runs as the branch
analysis `local/<branch>` and waits for the quality gate; on red the new findings are listed. The gate
counts what changed against `main` as new code (coverage ≥ 80 %, no new findings), `main` itself is
analyzed by the CI on push. Useful options: `--skip-e2e`, `--skip-sonar`, `--skip-security`,
`--sonar-only`, `--fail-fast`; `--help` lists everything.

## Releases

Releases are made locally with `tools/local-release.sh` (no CI minutes): it determines the next version
from the newest `vX.Y.Z` tag, commits `Bump version to X.Y.Z` when needed (the version in package.json
is what `/health` reports), builds the image, pushes it to GHCR as `ghcr.io/tobciu/curvytron:<version>`
and `:latest`, tags the commit and creates the GitHub release.

    tools/local-release.sh [major|minor|patch] [commit-ish] [--dry-run]

One-time prerequisite: `gh auth refresh -h github.com -s write:packages` (docker is logged in at ghcr.io
through the gh token by the script itself). `--dry-run` builds the image but commits, pushes and
releases nothing.

`tools/check-pending-releases.sh [ref]` answers the question before deploying: does the newest tag
already contain all app-source commits of the ref (src, public, assets, Dockerfile, package files)? If
it lists pending commits, run `tools/local-release.sh` with a suitable bump. On the VPS the compose
service can then use `image: ghcr.io/tobciu/curvytron:latest` with `docker compose pull`, or keep
`build: .` and check out the tagged commit.

## Stress test

The stress test creates a room, adds 50 players in it and set them ready so the game launch.
To use it, open your console an run:

```js
var stressTest = document.createElement('script');
stressTest.src = 'stressTest.js';
document.head.appendChild(stressTest);
```
