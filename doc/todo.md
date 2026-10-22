# TODO

Living list of planned work. Tick items off (`[x]`) when they are merged and add new ones at the bottom of their section.

## Next

- [x] **Game statistics** (`GameStats` service per game, in memory, shown with the final ranking)
    - [x] Counters per player from the game events: bonuses caught (per type), deaths by wall / own trail / other trail, kills, distance driven, trail length, longest time alive, rounds won
    - [x] `game:stats` event at the end of every round, with awards (bonus hunter, wall lover, own worst enemy, hunter, marathon driver, survivor)
    - [x] Vue component `GameStats.vue` below the ranking, unit tests and e2e check
    - [x] The awards and the table are shown at the end of the game only (between two rounds there are 5 s, too short to read them)
    - [ ] Statistics per bonus type in the UI (the data is already sent: `bonusesByType`)
- [ ] Statistics: icons in the titles of the table (the icon font has only a few glyphs, a new set is needed)
- [ ] Statistics: skill measures (not urgent)
    - [x] Near misses: one more look in the islands of the world per avatar and frame (`GameStats.testNearMiss`), counted once per approach to a foreign trail closer than half an avatar radius; award "close call"
    - [x] Squeezes: foreign trails on both sides of the avatar (looks at the sides with two probes), award "Needle's eye"
    - [x] Nothing counts while an avatar is invincible (no farming with the crown bonus); there is no statistic for the trails it goes through
    - [x] Result of every round (winner, duration) and bars in the table
    - [ ] Values per round (who did what in a round), shown on click on a player
    - [ ] "Comeback" (won a round after being the last one in the round before): needs the order of the deaths per round, not for now
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
- [x] **Load test** (`npm run load-test`): the server is not the limit, 48 players in 6 games need 0.1 ms per frame
    - [ ] Run it against the VPS (`--url`) to include the network and the proxy
- [ ] Investigate the small stutter seen with 5 players + 1 spectator: the server is fast enough (see the load test), so look at the client (rendering, garbage collection) and the network: note the fps / ping of the footer when it happens
- [ ] Look into the flaky e2e test `presets and individual bonuses` (fails now and then in a full run, passes alone)

- [ ] **Quality**
    - [x] Smoke test that starts the server with plain Node (`tests/launcher.test.js`): the other server tests run through Vite, which is more forgiving than Node about imports
    - [ ] Run the Docker image in CI (build, start, `/metrics` and the home page answer), so that the Dockerfile is tested too
    - [ ] Test the launcher with the Inspector enabled (the path of the dynamic import is only checked by reading the code)
    - [ ] Coverage report in CI (`vitest --coverage`), look at the holes: controllers, kick votes, flood filter, trackers
    - [x] Protocol tests with several clients (`tests/protocol.test.js`): a whole game, a client that leaves, a spectator, ~50 kinds of wrong data. This found that one `[null]` message crashed the whole server: fixed
    - [x] The handlers validate the data and answer with an error; limits for the events per second, the players and the rooms (see `doc/dev.md`)
    - [ ] Run the visual tests in CI without `continue-on-error` (needs stable fonts / screenshots in the CI image)
    - [ ] Dependabot or Renovate for the dependencies, `npm audit` in CI

## Later

- [ ] **SQLite persistence** of the game statistics (leaderboard, history)
    - [ ] Concept: [`doc/persistence.md`](persistence.md) (what is stored, how players are recognized, five steps)
    - [ ] Keep the `GameStats` result format serializable so that storing it is only an adapter
    - [ ] Database file in a Docker volume
- [x] Bonus registry (`src/shared/bonuses.ts`) and sprite built from one image per bonus (`npm run sprite`), see `doc/bonuses.md`
- [x] Presets and the server classes come from the registry (a new bonus: a class, an entry in the list, an image)
- [x] The network protocol is described as types (`src/shared/protocol.ts`), `noImplicitOverride` is on, `src/client/lib` is TypeScript
- [ ] Replace the remaining `any` (about 580, `tests/quality.test.js` only lets the number go down): the callbacks of the repositories, the fields of `RoomRepository` (they can be null), the messages of the chat, the canvas
- [x] Operations: the Dockerfile refuses a Node older than 22.18, `/health` (also the Docker health check), a log file (`log.file`), a bug in a game ends that game only (`curvytron_game_errors_total`)
- [ ] Pin the exact Node version in the Dockerfile and CI (now: the latest 22.x) once the images are tested in CI
- [ ] Documentation: network protocol, how to add a bonus
