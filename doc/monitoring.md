# Monitoring

The server exposes metrics in the [Prometheus](https://prometheus.io) text format on `/metrics`. Prometheus scrapes them,
Grafana draws them.

## Metrics

| Metric                             | Type      | Description                                                            |
| ---------------------------------- | --------- | ---------------------------------------------------------------------- |
| `curvytron_clients`                | gauge     | Connected clients                                                      |
| `curvytron_rooms`                  | gauge     | Open rooms                                                             |
| `curvytron_games`                  | gauge     | Games being played                                                     |
| `curvytron_players`                | gauge     | Players in the rooms                                                   |
| `curvytron_avatars`                | gauge     | Avatars in the games being played                                      |
| `curvytron_connections_total`      | counter   | Clients that connected since the start                                 |
| `curvytron_games_total`            | counter   | Games started                                                          |
| `curvytron_rounds_total`           | counter   | Rounds started                                                         |
| `curvytron_bonuses_caught_total`   | counter   | Bonuses caught, label `type`                                           |
| `curvytron_event_errors_total`     | counter   | Events of the clients whose handler failed (wrong data, or a bug)      |
| `curvytron_deaths_total`           | counter   | Deaths, label `cause` (`wall`, `self`, `trail`)                        |
| `curvytron_tick_duration_seconds`  | histogram | Time the server needs to compute a frame (should stay far below 16 ms) |
| `curvytron_tick_interval_seconds`  | histogram | Time between two frames (more than ~17 ms: the game loop is late)      |
| `curvytron_client_latency_seconds` | histogram | Round trip time of the pings sent to the clients                       |
| `curvytron_process_memory_bytes`   | gauge     | Memory of the server, label `type` (`rss`, `heap_used`)                |
| `curvytron_process_cpu_seconds`    | gauge     | CPU time used by the server, label `mode` (`user`, `system`)           |
| `curvytron_process_uptime_seconds` | gauge     | Time since the server started                                          |

The tick histograms are the ones to look at when players see stutter: `tick_duration` tells if the server is too slow
to compute a frame, `tick_interval` tells if the frames come too late (busy machine, garbage collection...).

## Protect the endpoint

`/metrics` only holds numbers, but it is not meant for the players:

- Block it in the reverse proxy (`location = /metrics { return 404; }` in [nginx-proxy.md](nginx-proxy.md)) and let
  Prometheus reach the server directly (same Docker network, or a port that is not published to the internet).
- And/or set a token in `config.json` (`{ "metrics": { "token": "..." } }`). Prometheus then needs to send it.

## Prometheus

Add a scrape job to `prometheus.yml` (when Prometheus and Curvytron share a Docker network, the target is the name of
the container):

```yaml
scrape_configs:
    - job_name: curvytron
      scrape_interval: 5s
      metrics_path: /metrics
      static_configs:
          - targets: ['curvytron:8080']
      # Only with a token in the config of the server:
      # authorization:
      #     credentials: a-long-random-string
```

Check on `http://<prometheus>/targets` that the job is `UP`.

## Grafana

Add Prometheus as a data source, then use for example these queries in the panels of a Curvytron dashboard:

| Panel                   | Query                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Players, rooms, games   | `curvytron_players`, `curvytron_rooms`, `curvytron_games`                                                                      |
| Tick duration p99       | `histogram_quantile(0.99, sum(rate(curvytron_tick_duration_seconds_bucket[1m])) by (le))`                                      |
| Tick interval p99       | `histogram_quantile(0.99, sum(rate(curvytron_tick_interval_seconds_bucket[1m])) by (le))`                                      |
| Late frames (> 33 ms)   | `1 - sum(rate(curvytron_tick_interval_seconds_bucket{le="0.033"}[1m])) / sum(rate(curvytron_tick_interval_seconds_count[1m]))` |
| Ping p95                | `histogram_quantile(0.95, sum(rate(curvytron_client_latency_seconds_bucket[1m])) by (le))`                                     |
| Games per hour          | `increase(curvytron_games_total[1h])`                                                                                          |
| Bonuses caught, by type | `sum(increase(curvytron_bonuses_caught_total[1h])) by (type)`                                                                  |
| Deaths, by cause        | `sum(increase(curvytron_deaths_total[1h])) by (cause)`                                                                         |
| Memory                  | `curvytron_process_memory_bytes`                                                                                               |
| CPU                     | `rate(curvytron_process_cpu_seconds[1m])`                                                                                      |

The tick histograms have no `game` label on purpose: all games share the same server loop, and the cost of a label per
game would only grow.
