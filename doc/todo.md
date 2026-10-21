# TODO

Living list of planned work. Tick items off (`[x]`) when they are merged and add new ones at the bottom of their section.

## Next

- [ ] **Game statistics** (`GameStats` service per game, in memory)
    - [ ] Count per player from the existing game events: bonuses caught (per type), deaths by wall / own trail / other trail, distance driven, longest time alive, trail length
    - [ ] New event at round end and game end carrying the results
    - [ ] Vue component showing the results (table, awards such as "bonus hunter", "wall lover")
    - [ ] Unit tests for the counters
- [ ] **Operational metrics** for Grafana
    - [ ] Decide the data source of the Grafana stack on the VPS: Prometheus (`/metrics` endpoint) or the existing InfluxDB inspector
    - [ ] Tick duration (average, p99), players, rooms, games, ping per client
    - [ ] No per-tick console output
    - [ ] Example Grafana dashboard in `doc/`
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
