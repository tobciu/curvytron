# TODO

Living list of planned work. Tick items off (`[x]`) when they are merged and add new ones at the bottom of their section.

## Next

- [ ] **Game statistics** (`GameStats` service per game, in memory)
    - [ ] Count per player from the existing game events: bonuses caught (per type), deaths by wall / own trail / other trail, distance driven, longest time alive, trail length
    - [ ] New event at round end and game end carrying the results
    - [ ] Vue component showing the results (table, awards such as "bonus hunter", "wall lover")
    - [ ] Unit tests for the counters
- [ ] **Operational metrics** for Grafana
    - [ ] `/metrics` endpoint in the Prometheus format (decided: nothing reads Curvytron data yet, pull is the simplest: no credentials in the game, one scrape job in the Prometheus of the Grafana stack; check that the stack has Prometheus)
    - [ ] Tick duration (average, p99), players, rooms, games, ping per client
    - [ ] No per-tick console output
    - [ ] Example Grafana dashboard in `doc/`
- [ ] **Grafana setup on the VPS** (to do by hand, once `/metrics` exists)
    - [ ] Check that the stack has a Prometheus (otherwise add one, or switch to the InfluxDB inspector)
    - [ ] Add a scrape job for the Curvytron container (`/metrics`, same Docker network or published port, not reachable from the internet)
    - [ ] Block `/metrics` in the nginx proxy (see `doc/nginx-proxy.md`)
    - [ ] Check in Grafana > Explore that the `curvytron_*` metrics arrive
    - [ ] Create a **Curvytron dashboard**: players, rooms and games now / over time, tick duration (avg, p99), ping per client; export it as JSON into `doc/grafana/`
    - [ ] Optional: alert when the tick duration is too high
- [ ] **Load test**: 8-10 simulated clients in one game, read the metrics at the end (tick duration, dropped frames)
- [ ] Investigate the small stutter seen with 5 players + 1 spectator (check client FPS / ping in the metrics footer when it happens)
- [ ] Look into the flaky e2e test `presets and individual bonuses` (fails now and then in a full run, passes alone)

## Later

- [ ] **SQLite persistence** of the game statistics (leaderboard, history)
    - [ ] Keep the `GameStats` result format serializable so that storing it is only an adapter
    - [ ] Database file in a Docker volume
- [ ] Build the bonus sprite (`public/images/bonus.png`) from one image per bonus; single registry for the bonus list (`RoomConfig`, sprite positions, presets)
- [ ] Share the network protocol types (event names and payloads) between client and server
- [ ] Replace the remaining `any` in the client model; enable `noImplicitOverride`
- [ ] Convert `src/client/lib` to TypeScript
- [ ] Pin the Node version (>= 22.18) in the Dockerfile and CI
- [ ] Error logging on the server (unexpected messages, crashes) to a file / the Docker log
- [ ] Health endpoint with player and room counts
- [ ] Documentation: network protocol, how to add a bonus
