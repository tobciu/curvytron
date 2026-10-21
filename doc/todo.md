# TODO

Living list of planned work. Tick items off (`[x]`) when they are merged and add new ones at the bottom of their section.

## Next

- [x] **Game statistics** (`GameStats` service per game, in memory, shown with the final ranking)
    - [x] Counters per player from the game events: bonuses caught (per type), deaths by wall / own trail / other trail, kills, distance driven, trail length, longest time alive, rounds won
    - [x] `game:stats` event at the end of every round, with awards (bonus hunter, wall lover, own worst enemy, hunter, marathon driver, survivor)
    - [x] Vue component `GameStats.vue` below the ranking, unit tests and e2e check
    - [ ] Show the statistics of a round at the end of the round too (only the game end shows them for now)
    - [ ] Statistics per bonus type in the UI (the data is already sent: `bonusesByType`)
- [ ] Statistics: skill measures (not urgent)
    - [ ] Near misses: smallest distance to a foreign trail per tick, count the passes under a threshold (about half an avatar radius); award "close call"
    - [ ] Driving through gaps of a foreign trail (needs gap detection in the trails)
    - [ ] Count what an avatar survived thanks to the invincibility (crown bonus)
- [x] **Operational metrics**: `/metrics` endpoint in the Prometheus format (see `doc/monitoring.md`)
    - [x] Tick duration and interval (histograms), players, rooms, games, ping, bonuses, deaths, memory, CPU
    - [x] No per-tick console output; optional token, blocked in the reverse proxy
    - [ ] Check the numbers under load (next item) and adjust the buckets if needed
- [ ] **Grafana setup on the VPS** (to do by hand)
    - [ ] Check that the stack has a Prometheus (otherwise add one, or switch to the InfluxDB inspector)
    - [ ] Add the scrape job of `doc/monitoring.md` for the Curvytron container (same Docker network or a port that is not published)
    - [ ] Block `/metrics` in the nginx proxy (see `doc/nginx-proxy.md`), set a token if the port is reachable
    - [ ] Check in Grafana > Explore that the `curvytron_*` metrics arrive
    - [ ] Create a **Curvytron dashboard**: players, rooms and games now / over time, tick duration (avg, p99), ping per client; export it as JSON into `doc/grafana/`
    - [ ] Optional: alert when the tick duration is too high
- [ ] **Load test**: 8-10 simulated clients in one game, read the metrics at the end (tick duration, dropped frames)
- [ ] Investigate the small stutter seen with 5 players + 1 spectator (check client FPS / ping in the metrics footer when it happens)
- [ ] Look into the flaky e2e test `presets and individual bonuses` (fails now and then in a full run, passes alone)

- [ ] **Quality**
    - [x] Smoke test that starts the server with plain Node (`tests/launcher.test.js`): the other server tests run through Vite, which is more forgiving than Node about imports
    - [ ] Run the Docker image in CI (build, start, `/metrics` and the home page answer), so that the Dockerfile is tested too
    - [ ] Test the launcher with the Inspector enabled (the path of the dynamic import is only checked by reading the code)
    - [ ] Coverage report in CI (`vitest --coverage`), look at the holes: controllers, kick votes, flood filter, trackers
    - [ ] Protocol tests with several `TestClient`s: a whole game over the socket, a client that leaves in the middle, garbage messages
    - [ ] Fuzz the socket input (wrong types, missing fields): the handlers read `data.name` and similar without checks
    - [ ] Run the visual tests in CI without `continue-on-error` (needs stable fonts / screenshots in the CI image)
    - [ ] Dependabot or Renovate for the dependencies, `npm audit` in CI

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
