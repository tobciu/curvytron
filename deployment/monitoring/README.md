# Monitoring

Grafana-Dashboard und Prometheus-Anbindung des Curvytron-Servers.

## Metriken

Der Server exponiert Prometheus-Metriken im Textformat unter **`/metrics`** (Port 8080,
standardmäßig aktiv; optional per `metrics.token` in der Server-Konfiguration abgesichert):

| Metrik | Typ | Bedeutung |
| --- | --- | --- |
| `curvytron_connections_total` | Counter | Clients, die sich seit Start verbunden haben |
| `curvytron_games_total`, `curvytron_rounds_total` | Counter | gestartete Spiele / Runden |
| `curvytron_bonuses_caught_total{type}` | Counter | gefangene Boni nach Typ |
| `curvytron_deaths_total{cause}` | Counter | Tode (`wall`, `self`, `trail`) |
| `curvytron_event_errors_total`, `curvytron_events_dropped_total`, `curvytron_game_errors_total` | Counter | Fehler & Flood-Verwürfe |
| `curvytron_clients`, `curvytron_rooms`, `curvytron_games`, `curvytron_players`, `curvytron_avatars` | Gauge | aktueller Spielstand |
| `curvytron_process_memory_bytes{type}`, `curvytron_process_cpu_seconds{mode}`, `curvytron_process_uptime_seconds` | Gauge | Prozess-Ressourcen |
| `curvytron_tick_duration_seconds` | Histogramm | Frame-Berechnung (sollte ≪ 16 ms bleiben) |
| `curvytron_tick_interval_seconds` | Histogramm | Zeit zwischen Frames (> 17 ms ⇒ Stutter) |
| `curvytron_client_latency_seconds` | Histogramm | RTT der Client-Pings |

## Dashboard als Code

`dashboards/curvytron-app.json` (UID `curvytron-app`, Grafana-Ordner *apps*) wird wie bei der
twitch-checkin-app 1:1 ins Infra-Repo gespiegelt:

```
deployment/monitoring/dashboards/curvytron-app.json
  ⇄ vps-infrastructure/monitoring/grafana/provisioning/dashboards/apps/curvytron-app.json
```

Grafana lädt die Datei per File-Provisioning automatisch live. Nach Änderungen an diesem
Dashboard also: hier committen **und** die Datei im Infra-Repo aktualisieren.

## Scrape-Anbindung

Der Prometheus-Job `curvytron` (Ziel `curvytron:8080`) liegt im Infra-Repo:
`monitoring/prometheus/prometheus.yml`. Dafür hängt der Container zusätzlich im
`monitoring`-Netz (`instellix/docker-compose.yaml`). Nach Infra-Änderungen:
`docker compose up -d curvytron` (Netz) und Prometheus neu laden.
