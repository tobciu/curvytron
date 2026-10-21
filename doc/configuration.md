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
