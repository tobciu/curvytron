# Client ↔ server protocol

Curvytron uses a **raw WebSocket** with a small **custom batched-JSON** protocol. It is
defined once in [`../src/shared/core/BaseSocketClient.js`](../src/shared/core/BaseSocketClient.js)
and used by both sides (`src/client/core/SocketClient.js`, `src/server/core/SocketClient.js`).
It is **not** Socket.IO / engine.io.

## Transport

- URL: `ws(s)://<host><pathname>` with WebSocket sub-protocol `"websocket"`
  (`wss` iff the page is `https`). Same origin as the page; the Node server upgrades any
  WS request in `Server.authorizationHandler`.
- Library: `faye-websocket` on the server, native `WebSocket` in the browser.
- Keepalive: `faye-websocket` `{ping: 30}` (30 s). The server also runs a `PingLogger`
  per socket (`pingInterval = 1000` ms) to measure round-trip latency.

## Framing

A single WS text message is `JSON.stringify(events)` where `events` is an array of
entries:

```
[name, data?, callbackId?]      // an event   (name = string)
[callbackId, data?]             // a reply     (callbackId = number)
```

- **Batching.** `addEvent(name, data, cb, force)` / `addEvents([...], force)` queue
  entries; a timer flushes the queue every `interval` ms. The **server** uses
  `interval = 1` ms, so all events produced within one game tick ship in one frame. The
  **browser** uses `interval = 0` → it sends immediately (its only hot path,
  `player:move`, is edge-triggered and rare). `force = true` bypasses the queue.
- **RPC callbacks.** If `addEvent` is given a callback, its id is sent as the 3rd element;
  the peer answers with `[id, replyData]`, which resolves the local callback exactly once.
  Used for every request that needs a success/error result (join, add player, talk, ...).
- **Compression.** Floats sent every tick are packed to integers by
  `shared/service/Compressor.js`: `compress(v) = (0.5 + v*100) | 0`, `decompress(i) = i/100`
  (2-decimal precision). Applies to `position`, `angle`, and bonus coordinates.

## Connection handshake

| Step | Event | Dir | Payload | Reply |
| --- | --- | --- | --- | --- |
| 1 | socket `open` | — | — | — |
| 2 | `whoami` | C→S | `null` | callback → `clientId` (string) |
| 3 | client stores id, emits local `connected` | — | — | — |

On connection the server also calls `RoomsController.attach(client)` (lobby events wired
up) — but no room data is pushed until the client asks with `room:fetch`.

Connection-level events after handshake:

| Event | Dir | Payload | Notes |
| --- | --- | --- | --- |
| `latency` | S→C | `number` (ms) | from server `PingLogger`, for the HUD |
| `activity` | C→S | `boolean` | tab focus/visibility (client `ActivityWatcher`) |
| `client:activity` | S→C | `{client, active}` | broadcast of the above to a room |

## Lobby events (`RoomsController`)

Active from connection. All C→S here use a callback.

| Event | Dir | Payload | Callback / result |
| --- | --- | --- | --- |
| `room:fetch` | C→S | — | server replies with a burst of `room:open`, one per room |
| `room:create` | C→S | `{name}` (blank → random name) | `{success:true, room}` or `{success:false}` |
| `room:join` | C→S | `{name, password?}` | `{success:true, room, master, clients[], messages[], votes[]}` or `{success:false, error}` |
| `room:open` | S→C | `{name, players:<count>, game:<bool>, open:<bool>}` | room appeared / list entry |
| `room:close` | S→C | `{name}` | room gone |
| `room:players` | S→C | `{name, players:<count>}` | player count changed |
| `room:game` | S→C | `{name, game:<bool>}` | game started/ended in that room |
| `room:config:open` | S→C | `{name, open}` | room privacy changed (list badge) |

`room:join`'s reply is the full room state: `room` = `{name, players:[{client,id,name,color,ready}], game:<bool>, open, config:{maxScore, variables, bonuses, open, password}}`,
`master` = client id or `null`, `clients` = `[{id, active}]`, `messages` = last 100 chat
messages, `votes` = open kick votes.

## In-room events (`RoomController`)

Wired up for a client after a successful `room:join`.

### Client → server (all with callback)

| Event | Payload | Callback |
| --- | --- | --- |
| `room:leave` | — | (also fires implicitly on socket close) |
| `room:talk` | `content` (string, ≤ 140) | `{success}` |
| `player:add` | `{name, color?}` | `{success}` / `{success:false, error}` |
| `player:remove` | `{player:<playerId>}` | `{success}` |
| `player:kick` | `{player:<playerId>}` | `{success, kicked}` |
| `room:ready` | `{player:<playerId>}` | `{success, ready}` — toggles; all-ready auto-launches |
| `room:color` | `{player, color}` | `{success, color}` |
| `room:name` | `{player, name}` | `{success, name}` / error |
| `activity` | `boolean` | — |

### Room-master only (client → server)

Wired only for the client that currently holds `roomMaster`.

| Event | Payload | Callback |
| --- | --- | --- |
| `room:config:open` | `{open:<bool>}` | `{success, open, password}` |
| `room:config:max-score` | `{maxScore}` | `{success, maxScore}` |
| `room:config:variable` | `{variable, value}` (only `bonusRate`, −1…1) | `{success, value}` |
| `room:config:bonus` | `{bonus:<ClassName>}` | `{success, enabled}` — toggles |
| `room:launch` | — | starts/cancels the `launchTime` (5 s) countdown |

### Server → room (broadcast)

| Event | Payload |
| --- | --- |
| `client:add` | `{client:{id, active}}` |
| `client:remove` | `<clientId>` |
| `client:activity` | `{client, active}` |
| `room:master` | `{client:<clientId>}` |
| `room:join` | `{player:{client,id,name,color,ready}}` |
| `room:leave` | `{player:<playerId>}` |
| `room:talk` | `{client, content, creation:<ms>, name, color}` |
| `player:color` | `{player, color}` |
| `player:name` | `{player, name}` |
| `player:ready` | `{player, ready}` |
| `room:config:open` | `{open, password}` |
| `room:config:max-score` | `{maxScore}` |
| `room:config:variable` | `{variable, value}` |
| `room:config:bonus` | `{bonus, enabled}` |
| `room:launch:start` / `room:launch:cancel` | — |
| `room:kick` | `<playerId>` |
| `vote:new` / `vote:close` | `{target:<playerId>, result:<bool>}` |
| `room:game:start` | — (a game now exists — navigate to the game view) |

## In-game events (`GameController`)

The game controller attaches to **every** client in the room when the game is created.
Clients that are actually playing also get `player:move` wired.

### Client → server

| Event | Payload | Notes |
| --- | --- | --- |
| `ready` | — | client finished loading; server marks its avatars ready or, if the game already started, treats it as a spectator (`spectate` burst) |
| `player:move` | `{avatar:<avatarId>, move: -1 \| 1 \| false}` | edge-triggered on key state change; `-1` left, `1` right, `false` release |

### Server → clients (`socketGroup`, batched per tick)

| Event | Payload | Meaning |
| --- | --- | --- |
| `game:start` | — | warmup done, avatars moving |
| `game:stop` | — | round simulation halted |
| `round:new` | — | new round set up (avatars placed) |
| `round:end` | `<winnerAvatarId>` \| `null` | round decided |
| `clear` | — | all trails wiped (`BonusGameClear` or new round) |
| `borderless` | `boolean` | game borderless toggled |
| `end` | — | game over → back to room |
| `game:leave` | `<avatarId>` | a player left mid-game |
| `game:spectators` | `<count>` | spectator count changed |
| `spectate` | `{inRound, rendered:<bool>, maxScore}` + burst of `position` / `property` / `die` / `bonus:pop` | full state for a mid-game joiner |
| `position` | `[avatarId, cx, cy]` (compressed) | per-tick, batched |
| `angle` | `[avatarId, cAngle]` (compressed) | per-tick, batched |
| `point` | `<avatarId>` | avatar started a new solid trail segment |
| `die` | `[avatarId, killerAvatarId \| null, old]` | death (`old` = death index, for scoring UI) |
| `score` | `[avatarId, score]` | cumulative score |
| `score:round` | `[avatarId, roundScore]` | current-round score |
| `property` | `[avatarId, property, value]` | live avatar property change (`angle`, `radius`, `color`, `printing`, `inverse`, `invincible`, `directionInLoop`, ...) |
| `bonus:pop` | `[bonusId, cx, cy, "<BonusClassName>"]` | bonus appeared |
| `bonus:clear` | `<bonusId>` | bonus removed (picked up or round end) |
| `bonus:stack` | `[avatarId, "add" \| "remove", bonusId, "<BonusClassName>", duration]` | effect applied/removed on an avatar |

## Notes for the rewrite

- The protocol is **transport-agnostic** — it only needs `socket.send(string)` and
  `message` / `close` events. Swapping `faye-websocket` for `ws` (roadmap phase 3) needs
  no protocol change. A framework rewrite of the client reuses `BaseSocketClient`
  verbatim.
- Event names are **strings scattered across controllers**; there is no shared schema/enum
  and no payload validation. First modernization win: extract a typed event map (one
  module listing every event, direction, and payload type) that both sides import.
- Callbacks are positional array slots — a typed wrapper (`request(name, data): Promise`)
  would make the client code much clearer.
