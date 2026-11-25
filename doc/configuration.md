## Configuration

To setup a custom configuration, duplicate `config.json.sample` to `config.json`:

    cp config.json.sample config.json

Details of `config.json`:

```json
{
    "port": 8080,
    "inspector": {
        "enabled": false,
        "host": "127.0.0.1",
        "port": 8086,
        "username": "root",
        "password": "root",
        "database": "curvytron"
    }
}
```

## Configuration reference

| Variable | Description                                                                                    | Default value | Type   | Required |
| -------- | ---------------------------------------------------------------------------------------------- | ------------- | ------ | -------- |
| port     | The port on which Curvytron server will run (the `PORT` environment variable takes precedence) | 8080          | Number | Required |

**Scoring modes:**

The modes that are still in development are hidden from the room settings and the rules page, and the server rejects them.
A mode is disabled by default (`enabledScoringModes` in `src/shared/scoring.ts`, currently only `classic`). To publish a
mode, flip it there, or set the environment variable:

| Variable                | Description                                                                                              | Default value | Type   | Required |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------- | ------ | -------- |
| `ENABLED_SCORING_MODES` | Comma-separated list of the enabled modes (`classic`, `starchase`); unknown entries are ignored with a warning | none          | String | Optional |

The list is read once at launch: the server announces it to every connecting browser, so the page follows without a
rebuild. Unset means the default of the code.

**Log:**

What the server prints (clients, errors, warnings) can also be written to a file, with the time and the level of every
line. The console keeps working (Docker collects it). The file is only appended to: let logrotate (`copytruncate`) or the
host manage its size. In Docker, mount a volume on `/curvytron/logs` to keep it.

| Variable | Description                                       | Default value | Type   | Required |
| -------- | ------------------------------------------------- | ------------- | ------ | -------- |
| file     | Path of the log file, relative to the application | none          | String | Optional |

```json
{ "log": { "file": "logs/curvytron.log" } }
```

**Storage:**

The results of the finished games (players, scores, statistics, rounds, special feats) are kept in a SQLite database, the
one built into Node (nothing to install). A game is written once, when it ends. A problem of the database never
disturbs a game: the server says it in the log and in `/health` and goes on without keeping the games.

| Variable | Description                                                                             | Default value     | Type    | Required |
| -------- | --------------------------------------------------------------------------------------- | ----------------- | ------- | -------- |
| enabled  | Keep the games                                                                          | true              | Boolean | Optional |
| file     | Path of the database, relative to the application (`:memory:` for one that is not kept) | data/curvytron.db | String  | Optional |

The `DATABASE_FILE` environment variable takes precedence over `file`.

```json
{ "storage": { "enabled": true, "file": "data/curvytron.db" } }
```

- **Docker**: mount a volume on `/curvytron/data` (the compose file does), otherwise the database is lost with the container.
- **Backup**: copy the file only when the server is stopped (it runs in WAL mode), or make a consistent copy while it
  runs: `sqlite3 data/curvytron.db ".backup backup.db"`.
- **What is kept**: only games with at least two browsers (nobody collects points alone), and only the first player of
  every browser: more players on one device take part but are not kept.
- **Identity**: the browser keeps a secret code (`curvytron.identity` in its storage) and sends it once connected, not in
  the address of the socket. The server keeps only its SHA-256, so the players of a browser add up in `player_totals`
  over all their games. The players manage it in their profile ("Statistics"): show in the public lists or not (then they
  are "Anonymous" in the lists, also in past games), show and copy the code to use it in another browser, use another code,
  get a new one (the history goes along, the old code stops working), start fresh, or delete their data. The page `#/stats`
  shows the leaderboard, the games, the records and the own totals and feats.
  `npm run storage:rebuild [file]` builds the totals again from the games (stop the server first).
- **One server per file**: do not start two servers on the same database.
- The room master can give the room a **tag** in the room settings (`daily`, `launch`), at any time: the games of the room
  are stored with the tag it has when they end, so that they can be grouped later. The tag is also carried by the url of
  the room (`#/room/<name>?tag=<tag>`): the link can be saved as a favorite, and it sets the tag when the master opens it.
- Every player can give themselves a free **tag** in the profile (Player fieldset, after the color): the team, the product
  owner, whatever the player needs. The tag lives in the browser profile and in the server next to the identity (`players.tag`,
  migration 5), is cleaned like the room tag (lowercase, digits, dashes, max 24), and is sent with the name and color to the
  room: it is shown as a badge next to the name in the room and in the game. The tag is kept in the room from the moment the
  profile changes it (not just at the end of a game), and it does not enter the public lists (leaderboard, records, games);
  the ones who hide their identity stay out.
- At the end of a game, the tag of every player is stored as a **copy** in the game (`game_players.tag`, migration 6): a
  snapshot, not a link — a later change of the tag does neither rewrite the past game nor recalculate any statistic. The
  copy goes with the name when the identity is deleted.

**Metrics:**

The server exposes its metrics in the Prometheus format on `/metrics` (see [monitoring](monitoring.md)).

| Variable | Description                                                        | Default value | Type    | Required |
| -------- | ------------------------------------------------------------------ | ------------- | ------- | -------- |
| enabled  | Enable/Disable the `/metrics` endpoint                             | true          | Boolean | Optional |
| token    | When set, the requests need the header `Authorization: Bearer ...` | none          | String  | Optional |

```json
{ "metrics": { "token": "a-long-random-string" } }
```

**Inspector:**

The inspector watch the server to provides statistics like:

- Total of played games
- Number of players per game
- Game duration
- CPU / Memory usage of the server
- ...

| Variable | Description                  | Default value | Type    | Required |
| -------- | ---------------------------- | ------------- | ------- | -------- |
| enabled  | Enable/Disable the Inspector | false         | Boolean | Required |
| host     | InfluxDb host                | 127.0.0.1     | String  | Required |
| port     | InfluxDb port                | 8086          | Number  | Required |
| username | InfluxDb username            | root          | String  | Required |
| password | InfluxDb password            | root          | String  | Required |
| database | InfluxDb database            | curvytorn     | String  | Required |
