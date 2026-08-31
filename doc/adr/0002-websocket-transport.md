# ADR 0002 — WebSocket transport: migrate to `ws`

- **Status:** Accepted
- **Date:** 2026-08-31
- **Deciders:** repo owner
- **Related:** [ADR 0001](0001-client-framework.md), roadmap Phase 3

## Context

The server terminates WebSockets with **`faye-websocket`** (`src/server/dependencies.js`,
`src/server/core/Server.js`). It is **effectively unmaintained**: latest release `0.11.4`
is from **May 2021**, preceded by multi-year gaps (`0.11.1` Jan 2017 → `0.11.3` Jun 2019).
It predates modern Node WS practice. By contrast, **`ws`** is one of the most-used Node
packages and is actively released (`8.21.x` in 2025). On top of `faye-websocket` sits
Curvytron's own batched-JSON protocol
([`../protocol.md`](../protocol.md)), implemented in the shared class
`src/shared/core/BaseSocketClient.js`.

The custom protocol is **transport-agnostic** — `BaseSocketClient` only needs
`socket.send(string)` plus `message` / `close` events. The browser side already uses the
native `WebSocket`. So the transport can be modernized without touching the protocol,
the client, or the shared code.

The rejected alternative from the earlier spike was replacing the whole thing with
**Socket.IO**, which imposes its own framing, handshake, rooms and reconnection model —
that *is* a protocol rewrite and a client rewrite, and it caused the previous attempt to
break.

## Decision

Replace `faye-websocket` with [**`ws`**](https://github.com/websockets/ws) on the server,
keeping the Curvytron protocol framing **byte-for-byte unchanged**.

- `Server.authorizationHandler` becomes a `ws` `WebSocketServer` in `noServer` mode
  attached to the existing `http.Server` `upgrade` event.
- `src/server/core/SocketClient.js` adapts to the `ws` socket API (`ws.on('message')`,
  `ws.send()`, `ws.on('close')`) — a thin shim so `BaseSocketClient` is unchanged.
- Keepalive: implement ping/pong with `ws`'s built-in `ping()` + `pong` event and a
  per-socket liveness timer (replacing `faye`'s `{ping: 30}`); keep the existing
  `PingLogger` latency measurement.
- Do **not** adopt Socket.IO, and do **not** change event names, batching, callbacks or
  compression.

Timing: do this on its own small PR, **independent of** the client framework rewrite
(either before or after — they don't touch the same files).

## Consequences

- One new dependency (`ws`, widely used, actively maintained); `faye-websocket` removed.
- `src/server/core/Server.js` and `src/server/core/SocketClient.js` change; nothing else.
- Client and `src/shared/**` are untouched.
- Opens the door to standard `ws` middleware/options later (per-message deflate,
  `maxPayload`, origin checks) if wanted.
- Reconnection stays a client concern (today: none — the page shows a "disconnected"
  screen with a reload button); improving it is out of scope for this ADR.
