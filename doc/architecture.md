# Architecture

How Curvytron is put together, end to end. Companion to the overview in
[`../README.md`](../README.md) and the working notes in [`../CLAUDE.md`](../CLAUDE.md).

## 1. The three source trees

```
src/shared/   pseudo-classes shared verbatim by client and server
src/client/   browser app  (AngularJS UI + canvas rendering + client-side sim)
src/server/   node app      (authoritative simulation + room/lobby management)
```

`src/shared/` holds constructor-function "classes" (`function BaseGame(){}` +
`BaseGame.prototype.method = ...`). Both sides subclass them:

| Shared base | Server subclass | Client subclass |
| --- | --- | --- |
| `shared/model/BaseGame.js` | `server/model/Game.js` | `client/model/Game.js` |
| `shared/model/BaseAvatar.js` | `server/model/Avatar.js` | `client/model/Avatar.js` |
| `shared/model/BaseTrail.js` | `server/model/Trail.js` | `client/model/Trail.js` |
| `shared/model/BaseRoom.js` | `server/model/Room.js` | `client/model/Room.js` |
| `shared/model/BaseRoomConfig.js` | `server/model/RoomConfig.js` | `client/model/RoomConfig.js` |
| `shared/model/BaseBonus.js` + `BaseBonusStack` | `server/model/Bonus/*` | `client/model/bonus/*` |
| `shared/core/BaseSocketClient.js` | `server/core/SocketClient.js` | `client/core/SocketClient.js` |
| `shared/manager/BaseBonusManager.js` | `server/manager/BonusManager.js` | `client/manager/BonusManager.js` |
| `shared/Collection.js` | — (used as-is both sides) | — |

Shared constants (balancing) are `prototype` properties, e.g.
`BaseAvatar.prototype.velocity = 16`, `BaseGame.prototype.framerate = 1000/60`,
`BaseGame.prototype.warmupTime = 3000`.

## 2. Build → bundles (no modules!)

[`gulpfile.js`](../gulpfile.js) + [`recipes/`](../recipes) drive everything. There is **no
`require`/`import`** in `src/` (except `src/server/dependencies.js`). Instead:

- **Client bundle** — [`recipes/client.json`](../recipes/client.json) globs
  `src/shared/**` then `src/client/**` (minus `stressTest.js`), `concat` → wrap in
  `(function(){ "use strict"; ... })()` → `web/js/curvytron.js`. Third-party libs are
  concatenated separately into `web/js/dependencies.js` (`front-expose` task, list
  hard-coded in `gulpfile.js`).
- **Server bundle** — [`recipes/server.json`](../recipes/server.json) globs
  `src/server/dependencies.js`, `src/shared/**`, `src/server/**`, `src/server/launcher.js`
  → `concat` (no wrap, no minify) → `bin/curvytron.js`. `module.exports = server` at the
  end (from `launcher.js`) — but it's run directly with `node bin/curvytron.js`.
- **Views** — `src/client/views/*/**/*.html` minified into `web/js/views/`; Angular loads
  them by `templateUrl`. `src/client/views/index.html` is processed by the `ga` task
  (Google Analytics injection) into `web/index.html`.
- **Styles** — `src/sass/style.scss` (imports everything under `src/sass/`) → `sass` →
  `web/css/style.css`.

Because it's plain concatenation, **every top-level symbol is global within the bundle**
and **file glob order = load order**. New files under the globbed paths are included
automatically.

## 3. Server runtime

`node bin/curvytron.js`:

1. `launcher.js` reads `config.json` (or a safe default) and constructs
   `Server` ([`server/core/Server.js`](../src/server/core/Server.js)).
2. `Server` creates an Express app that serves `web/` statically, and an `http.Server`.
   On HTTP `upgrade` it validates the request is a WebSocket (`faye-websocket`), wraps it
   in a `SocketClient` (with a 1 ms flush interval), and hands it to `RoomsController`.
3. Optional `Inspector` (InfluxDB) attaches if `config.inspector.enabled`.

### Core objects

| Object | Responsibility |
| --- | --- |
| `Server` | HTTP + WS accept loop, client registry |
| `core/SocketClient` (+ shared `BaseSocketClient`) | Per-connection event batching/dispatch, RPC callbacks |
| `core/SocketGroup` | Broadcast helper for a set of clients |
| `controller/RoomsController` | Lobby: `room:fetch` / `room:create` / `room:join`, broadcasts `room:open` / `room:close` / `room:players` / `room:game` |
| `repository/RoomRepository` (+ `service/RoomNameGenerator`) | Owns all `Room`s |
| `model/Room` (+ `RoomController`) | One room: clients, players, chat, kick votes, room master, config, launch countdown |
| `model/RoomConfig` | `bonusTypes` map, `bonuses` on/off, `variables` (`bonusRate`), `maxScore`, password |
| `model/Game` (+ `controller/GameController`) | One running game: the update loop, kills, scoring, rounds |
| `core/World` → `core/Island` → `core/AvatarBody` / `core/Body` | Spatial-hash collision grid (`islandGridSize = 40`) |
| `manager/BonusManager` | Spawns/expires map bonuses, tests pickups |
| `manager/KickManager` / `model/KickVote` | Vote-kick |
| `manager/PrintManager` | Trail gap ("printing") timing per avatar |
| `trackers/*` + `core/Inspector` / `core/PingLogger` | Optional InfluxDB metrics |

### Game loop (authoritative)

`BaseGame.loop` (in `src/shared/model/BaseGame.js`) schedules itself with
`setTimeout(this.loop, this.framerate)` (~60 Hz). Each tick, `server/model/Game.js#update`:

- advances every alive `Avatar` by `step` ms;
- checks arena-bound intersection (`World.getBoundIntersect`) — wrap if `borderless`/ghost,
  else `kill`;
- checks trail/enemy collision (`World.getBody`) unless invincible → `kill`;
- runs `printManager.test()` (trail gaps) and `bonusManager.testCatch()`;
- if any death occurred, `checkRoundEnd()`.

Round flow: `newRound()` → `onRoundNew` (place avatars, clear world) → `start()` after
`warmupTime` → loop → last-avatar death → `endRound()` → `onRoundEnd` (`resolveScores`) →
`stop()` after `warmdownTime` → `onStop` → `isWon()` ? `end()` : `newRound()`.

Avatars emit `point` events as they move; `Game.onPoint` adds an `AvatarBody` to the
`World`, which is what later collisions hit.

## 4. Client runtime

`web/index.html` loads `dependencies.js` then `curvytron.js` and bootstraps the Angular
module `curvytronApp` (`ng-app` on `<body>`).
[`src/client/app.js`](../src/client/app.js) registers services + controllers and 4 routes:

| Route | Template | Controller |
| --- | --- | --- |
| `/` | `views/rooms/list.html` | `RoomsController` |
| `/room/:name` | `views/rooms/detail.html` | `RoomController` |
| `/game/:name` | `views/game/play.html` | `GameController` |
| `/about` | `views/pages/about.html` | — |

Key services: `SocketClient` (WS), `Profile` (local player identities, cookie-backed),
`RoomRepository` / `RoomsRepository` / `GameRepository` (mirror server state over the
socket), `Chat`, `SoundManager`, `Notifier`, `Radio`, `Analyser`, `ActivityWatcher`.

In-game controllers (`src/client/controller/game/`): `PlayerListController`,
`RoundController`, `MetricController`, `WaitingController`, `KillLogController`.

Rendering is framework-free: `core/Canvas.js` wraps a 2D context. The game view stacks
**four `<canvas>` layers** (`#background`, `#bonus`, `#game` — the trails/avatars —, and
`#effect`), each sized to the square arena (e.g. 792×792). The client `model/Game.js` runs
its own loop to draw trails, avatars and bonuses, using the same shared physics classes for
local prediction. Input mapping (keyboard/gamepad/touch) is in `model/PlayerInput.js` /
`model/PlayerControl.js` on top of the `tom32i-*` libs; `GamepadListener` is instantiated
once in `app.js`.

The lobby and homepage **are** responsive (they stack on narrow viewports); the **in-game
view is not** — it's a fixed desktop layout (canvas + left HUD column) that clips on small
screens, even though touch controls exist in `PlayerInput`. Making the game view responsive
is an explicit rewrite goal.

Screens seen on the live instance beyond the [screenshots](../README.md#screenshots): a
first-run **profile prompt** ("Hi there! We just need to know a few things…") shown when no
local player exists yet, and the **empty rooms list** ("Start by creating a room:").

## 5. Wire protocol

Defined once in [`src/shared/core/BaseSocketClient.js`](../src/shared/core/BaseSocketClient.js),
used by both sides.

- A frame is `JSON.stringify(events)` where `events` is an array of
  `[name, data?, callbackId?]`.
- Outgoing events are **queued and flushed on an interval** (`this.interval`; server uses
  1 ms) unless `force` is passed or interval is 0.
- `addEvent(name, data, callback, force)` — if `callback` is given, it's indexed and its
  id shipped as the 3rd element; the peer replies with `[callbackId, replyData]`.
- On receive: entries whose first element is a **string** are emitted as events
  (`this.emit(name, data)` or `this.emit(name, [data, replyFn])` when a callback id is
  present); entries whose first element is a **number** resolve a pending local callback.

Representative events: `room:fetch`, `room:create`, `room:join`, `room:open`,
`room:close`, `room:players`, `room:game`, `client:add`, `player:add`, `player:remove`,
`ready`, `room:config:*`, `room:launch`, `game:start`, `round:new`, `round:end`,
`position`, `angle`, `point`, `die`, `score`, `bonus:pop`, `bonus:clear`, `end`.

## 6. Where things live (quick index)

| Want to change... | Look at |
| --- | --- |
| Balancing / physics constants | `src/shared/model/BaseAvatar.js`, `BaseGame.js`, `BaseTrail.js` |
| A bonus | `src/server/model/Bonus/*`, `src/shared/model/BaseRoomConfig.js`, `src/server/model/RoomConfig.js`, client `src/client/model/bonus/*` |
| Collision / arena | `src/server/core/World.js`, `Island.js`, `src/server/model/Game.js` |
| Lobby / room lifecycle | `src/server/controller/RoomsController.js`, `RoomController.js`, `src/server/model/Room.js` |
| In-game networking | `src/server/controller/GameController.js`, `src/client/repository/GameRepository.js` |
| UI screens | `src/client/controller/*`, `src/client/views/*` |
| Rendering | `src/client/core/Canvas.js`, `src/client/model/Game.js`, `src/client/model/Avatar.js` |
| Build inclusion / order | `recipes/client.json`, `recipes/server.json`, `gulpfile.js` |

## 7. Known quirks (carry-overs to watch during the rewrite)

- **Double URL-encoding of room names.** The hash routes read
  `/#/room/The%2520great%2520conflict` — a space becomes `%2520` (encoded twice). Room
  names with spaces/punctuation round-trip only because both sides make the same mistake;
  the rewrite's router should encode once and fix this.
- **No payload validation** on socket events — every handler trusts `data.*` shapes.
- **Event-name strings are duplicated** across ~6 controllers with no shared schema
  (see [`protocol.md`](protocol.md) "Notes for the rewrite").
- **`stressTest.js`** is special-cased out of the client bundle and injected at runtime.
- **`config.json` is read twice** (`launcher.js` and `gulpfile.js` for the GA token).
- Client-side `SocketClient` sends unbatched (`interval = 0`); only the server batches.
