## Configuration

`config.json` is **optional** — without it the server runs on port 8080 with the Inspector
off. To customise, duplicate `config.json.sample` to `config.json` (git-ignored):

    cp config.json.sample config.json

Details of `config.json`:

```json
{
    "port": 8080,
    "inspector": {
        "enabled": false,
        "host": "localhost",
        "port": 8086,
        "username": "curvytron",
        "password": "curvytron",
        "database": "curvytron"
    }
}
```

Every value can also be set via an environment variable — env wins over `config.json`
(see [`src/server/main.ts`](../src/server/main.ts) `loadConfig()`).

## Configuration reference

| Variable | Env var | Description | Default | Type |
| -------- | ------- | ----------- | ------- | ---- |
| `port` | `PORT` | HTTP + WebSocket port | `8080` | Number |
| — | `STATIC_DIR` | Directory served as the client | `dist` if built, else `web` | String |

__Inspector__ (optional metrics reporter — see [`architecture.md`](architecture.md) and
[`../CLAUDE.md`](../CLAUDE.md)): writes counters/gauges to an InfluxDB **1.x** HTTP
`/write` endpoint (line protocol) via `fetch()`. Reports totals of connected clients / open
rooms, per-game round count and duration, per-client latency samples, and CPU/memory usage —
all pseudonymised (IPs/names hashed with MD5) and fire-and-forget (a write failure is logged
once and otherwise ignored; it never affects gameplay).

| Variable | Env var | Description | Default | Type |
| -------- | ------- | ----------- | ------- | ---- |
| `inspector.enabled` | `INSPECTOR_ENABLED` | Enable/disable the Inspector | `false` | Boolean |
| `inspector.host` | `INSPECTOR_HOST` | InfluxDB host | `127.0.0.1` | String |
| `inspector.port` | `INSPECTOR_PORT` | InfluxDB HTTP API port | `8086` | Number |
| `inspector.username` | `INSPECTOR_USERNAME` | InfluxDB username | `root` | String |
| `inspector.password` | `INSPECTOR_PASSWORD` | InfluxDB password | `root` | String |
| `inspector.database` | `INSPECTOR_DATABASE` | InfluxDB database name | `curvytron` | String |
