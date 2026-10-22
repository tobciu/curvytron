# Persistenz – Konzept

Status: Entwurf, nichts ist umgesetzt. Dieses Dokument beantwortet, **was** gespeichert wird, **wo**, **wie** Spieler
erkannt werden und **in welchen Schritten** es gebaut wird. Die Fragen, die der Spielleiter entscheiden muss, stehen
am Ende (Abschnitt 11).

## 1. Ziel

Bisher ist alles im Arbeitsspeicher: Wenn ein Spiel zu Ende ist oder der Server neu startet, sind Statistiken, Awards
und Feats weg. Mit Persistenz bekommen wir:

- **Verlauf**: die letzten Spiele mit Ergebnis, Statistik-Tabelle und Feats, genau wie am Spielende.
- **Bestenliste**: Siege, Siegquote, gewonnene Runden, Kills und so weiter.
- **Rekorde** ("Hall of Fame"): längste Serie, meiste Kills in einem Spiel, längstes Leben, meiste Gap runs.
- **Eigene Statistik**: was ich bisher gespielt, gewonnen und an Feats gesammelt habe.

**Kein Ziel**: Konten, Login, Passwörter, Matchmaking, Wetten oder irgendetwas, das Cheating attraktiv macht. Es geht
um Spaß unter Freunden, nicht um Wettbewerb mit Preisen.

## 2. Entscheidungen im Überblick

| Thema            | Vorschlag                                                                               |
| ---------------- | --------------------------------------------------------------------------------------- |
| Speicher         | SQLite, über das eingebaute `node:sqlite` (kein natives Modul, keine neue Abhängigkeit) |
| Wann schreiben   | Einmal pro Spiel, am Ende, in einer Transaktion                                         |
| Spieler erkennen | Anonym über das Browser-Token, nur als Hash gespeichert                                 |
| Zähler           | Als JSON pro Spieler und Spiel, damit neue Statistiken keine Migration brauchen         |
| Anzeige          | Nur lesende HTTP-Schnittstelle (`/api/...`) und eine Seite `#/stats`                    |
| Fehler           | Ein Fehler der Datenbank darf nie ein Spiel stören: loggen, zählen, weiterspielen       |
| Standard         | Zuerst **aus** (`storage.enabled`), nach der Erprobung an                               |
| Lieferung        | In fünf Stufen, jede ein eigener PR (Abschnitt 9)                                       |

## 3. Wo die Daten liegen

### 3.1 SQLite mit `node:sqlite`

Der Server läuft mit Node 22.18 oder neuer (Dockerfile und `engines` verlangen das schon). Dort ist `node:sqlite`
ohne Flag verfügbar. Das spricht dafür:

- Keine native Abhängigkeit, kein Bauen unter Alpine, keine zusätzliche Lieferkette.
- Eine einzige Datei, einfach zu sichern und zu kopieren.
- Die Last ist winzig: ein Schreibvorgang von wenigen KB pro Spiel.

Was dagegen spricht, und wie wir damit umgehen:

- **Experimentell**: Node gibt eine `ExperimentalWarning` aus, und die API könnte sich noch ändern. Gegenmittel: Der
  gesamte Zugriff steht hinter einer kleinen Schnittstelle (Abschnitt 6), die Version von Node ist im Dockerfile
  begrenzt, und CI testet die Datenbank. Die Warnung unterdrücken wir mit `--disable-warning=ExperimentalWarning` im
  `CMD`. Sollte die API brechen oder zu instabil sein, tauschen wir die eine Datei `SqliteStorage.ts` gegen
  `better-sqlite3` aus.
- **Synchron**: Jeder Aufruf blockiert die Event-Schleife. Bei einem Schreibvorgang pro Spiel (unter einer Millisekunde)
  und kleinen, indizierten Leseabfragen ist das unkritisch. Die Bestenliste wird zusätzlich kurz im Speicher gehalten
  (zum Beispiel 30 Sekunden).

Eingestellt wird der Modus WAL (`PRAGMA journal_mode = WAL`), damit Lesen und Schreiben sich nicht blockieren, und
`PRAGMA foreign_keys = ON`.

### 3.2 Konfiguration und Docker

```json
{ "storage": { "enabled": false, "file": "data/curvytron.db" } }
```

- Die Umgebungsvariable `DATABASE_FILE` hat Vorrang vor der Konfiguration (wie `PORT`).
- Das Dockerfile legt `data/` an und gibt es dem Benutzer `node`. `docker-compose.yml` bekommt einen Volume
  `curvytron-data:/curvytron/data`, **sonst sind die Daten beim Neuerzeugen des Containers weg**. Das muss in der
  Anleitung (`doc/installation.md`) fett stehen.
- Es gibt genau einen Server pro Datei. Mehrere Instanzen auf derselben Datei sind nicht vorgesehen.
- **Sicherung**: `sqlite3 data/curvytron.db ".backup backup.db"` oder `VACUUM INTO`. Ein Kopieren der Datei im laufenden
  Betrieb ist wegen WAL unsicher, das steht in der Anleitung.

### 3.3 Größe

Ein Spieler in einem Spiel braucht grob 0,5 bis 1 KB (Zähler als JSON), dazu etwas für Runden und Feats. Ein Spiel mit
5 Spielern sind etwa 5 KB. 10.000 Spiele sind 50 MB. Das ist für einen Freundeskreis kein Thema. Trotzdem gibt es
`storage.retentionDays` (Standard: ohne Begrenzung), das alte Spiele löscht. Die Summen bleiben davon unberührt, weil
sie in eigener Tabelle stehen (4.3).

## 4. Datenmodell

Versionierung der Tabellen über `PRAGMA user_version`. Die Migrationen sind eine Liste von SQL-Schritten in
`src/server/storage/schema.ts`, der Server führt beim Start die fehlenden aus.

### 4.1 Tabellen

```sql
-- Wer hat gespielt (anonym): ein Eintrag pro Browser
CREATE TABLE players (
    id          INTEGER PRIMARY KEY,
    token_hash  TEXT NOT NULL UNIQUE,   -- SHA-256 des Browser-Tokens
    name        TEXT NOT NULL,          -- zuletzt benutzter Name
    created_at  INTEGER NOT NULL,       -- Unix-Zeit in ms
    last_seen   INTEGER NOT NULL
);

CREATE TABLE games (
    id            INTEGER PRIMARY KEY,
    started_at    INTEGER NOT NULL,
    ended_at      INTEGER NOT NULL,
    room          TEXT NOT NULL,
    mode          TEXT NOT NULL DEFAULT 'classic',
    rounds        INTEGER NOT NULL,
    max_score     INTEGER NOT NULL,
    completed     INTEGER NOT NULL,     -- 1: jemand hat gewonnen, 0: alle sind gegangen
    config_json   TEXT NOT NULL,        -- Bonusse, Variablen der Spieler (für später)
    app_version   TEXT NOT NULL,
    stats_version INTEGER NOT NULL      -- Version der Statistik-Definitionen, siehe 4.4
);

CREATE TABLE game_players (
    game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    slot       INTEGER NOT NULL,        -- Platz im Spiel (0, 1, 2, ...)
    player_id  INTEGER REFERENCES players(id) ON DELETE SET NULL,  -- NULL: Gast
    name       TEXT NOT NULL,           -- Name im Spiel, wie er angezeigt wurde
    color      TEXT NOT NULL,
    rank       INTEGER NOT NULL,        -- 1 = Sieger
    score      INTEGER NOT NULL,
    rounds_won INTEGER NOT NULL,
    stats_json TEXT NOT NULL,           -- die übrigen Zähler (PlayerStats), siehe 4.2
    PRIMARY KEY (game_id, slot)
);

CREATE TABLE rounds (
    game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round       INTEGER NOT NULL,
    winner_slot INTEGER,                -- NULL: alle gleichzeitig gestorben
    duration_ms INTEGER NOT NULL,
    PRIMARY KEY (game_id, round)
);

CREATE TABLE feats (
    game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round      INTEGER NOT NULL,
    slot       INTEGER NOT NULL,
    feat       TEXT NOT NULL,           -- 'cleanSweep', ...
    other_slot INTEGER
);

-- Summen pro Spieler für die Bestenliste (siehe 4.3)
CREATE TABLE player_totals (
    player_id  INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    games      INTEGER NOT NULL DEFAULT 0,
    wins       INTEGER NOT NULL DEFAULT 0,
    rounds_won INTEGER NOT NULL DEFAULT 0,
    kills      INTEGER NOT NULL DEFAULT 0,
    deaths     INTEGER NOT NULL DEFAULT 0,
    totals_json TEXT NOT NULL DEFAULT '{}'   -- alle weiteren Summen
);

CREATE INDEX game_players_player ON game_players(player_id);
CREATE INDEX feats_game ON feats(game_id);
CREATE INDEX games_ended ON games(ended_at DESC);
```

### 4.2 Warum die Zähler als JSON

`PlayerStats` bekommt immer wieder neue Felder (Gap runs, Win streak waren die letzten). Wären das alles Spalten,
bräuchte jede neue Statistik eine Migration. Deshalb stehen nur das, was für Ranglisten immer gebraucht wird (`rank`,
`score`, `rounds_won`), als Spalten, der Rest in `stats_json`. SQLite kann das mit `json_extract` auswerten, bei
einigen Zehntausend Zeilen ist das schnell genug. Wird eine Auswertung zu langsam, wird das Feld zur Spalte (mit
Migration) oder in die Summen übernommen.

### 4.3 Summen

Die Bestenliste liest aus `player_totals`, nicht aus allen Spielen. Die Summen werden **in derselben Transaktion**
fortgeschrieben, in der das Spiel gespeichert wird. Weil sie sich jederzeit aus `game_players` neu berechnen lassen,
gibt es einen Befehl `npm run storage:rebuild`, der sie neu aufbaut. Das ist auch der Weg, wenn sich die Auswertung
ändert (zum Beispiel "ab wie vielen Spielen steht man in der Liste").

### 4.4 Statistik-Version

Die Statistik wächst. Wer vor der Einführung von "Gap runs" gespielt hat, hat dafür keinen Wert, und **0 wäre falsch**
(man hat es nicht gezählt, nicht nicht geschafft). Darum:

- Fehlende Felder in `stats_json` heißen "nicht erfasst", nicht 0.
- `games.stats_version` wird erhöht, wenn eine Zählweise sich ändert (zum Beispiel die Distanz).
- Auswertungen für ein Feld nehmen nur Spiele, in denen es vorkommt.

## 5. Spieler erkennen

Das ist die schwierigste Frage, weil das Spiel **keine Konten** hat. Bekannt sind ein Name, eine Farbe und ein
Browser-Token (`src/client/core/session.ts`), mit dem der Server wiedererkennt, wer nach einem Verbindungsabbruch
zurückkommt.

| Variante                         | Vorteil                                                | Nachteil                                                                                         |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **A. Nur der Name**              | Kein Aufwand                                           | Jeder kann jeden Namen nehmen, Doppelte vermischen sich, eine Namensänderung bricht die Historie |
| **B. Browser-Token** (Vorschlag) | Anonym, kein Login, Namensänderungen sind kein Problem | Gilt nur für diesen Browser, wer den Speicher löscht, ist ein neuer Spieler                      |
| **C. Konten**                    | Geräteübergreifend, sauber                             | Viel Aufwand, Passwörter, Datenschutz, passt nicht zum Spiel                                     |

**Vorschlag: B.** Im Detail:

- Gespeichert wird nur `SHA-256(token)`, nie das Token selbst. Das Token ist die Zugangsberechtigung zum laufenden
  Spiel (Wiederverbinden). Wer die Datenbank liest, soll keine Sitzungen übernehmen können.
- Das Token ist eine zufällige UUID mit hoher Entropie, ein einfacher SHA-256 reicht (kein Passwort-Hash nötig).
- Pro Browser gibt es einen Eintrag in `players`. Der Name wird bei jedem Spiel aktualisiert. In `game_players` steht
  der **Name im Spiel**, damit alte Spiele so aussehen, wie sie waren.
- **Mehrere Spieler an einem Gerät** (lokale Spieler im selben Raum) teilen sich ein Token. Nur der erste lokale
  Spieler wird dem Browser zugeordnet, die weiteren zählen als **Gäste** (`player_id = NULL`). Sie stehen im Verlauf,
  aber nicht in der Bestenliste.
- **Verlorene Identität**: Löscht jemand den Browser-Speicher, ist er ein neuer Spieler. Eine spätere Erweiterung ist
  ein "Wiederherstellungscode" im Profil (das Token zum Kopieren und Einfügen), mit dem man auf einem neuen Gerät
  weitermachen kann (Stufe 4).

### 5.1 Datenschutz

Name und Token-Hash gelten schon in einem Freundeskreis als personenbezogene Daten. Deshalb:

- Funktion "Meine Daten löschen" (Stufe 4): löscht den `players`-Eintrag; die Spiele bleiben erhalten, der Spieler darin
  wird zum Gast (`ON DELETE SET NULL`), der Name im Spiel bleibt aber stehen. Wer den Namen auch entfernt haben will,
  kann ihn durch "Anonym" ersetzen lassen.
- Die Seite `#/stats` sagt klar, **was** gespeichert wird und **für wen** es sichtbar ist (alle, die den Server
  erreichen).
- Standardmäßig ausgeschaltet (`storage.enabled`), wer den Server betreibt, entscheidet bewusst.
- Keine IP-Adressen, keine Browser-Kennungen außer dem Token-Hash.

## 6. Aufbau im Code

```
src/server/storage/
 |- Storage.ts          # Schnittstelle: saveGame, leaderboard, recentGames, player, deletePlayer, close
 |- SqliteStorage.ts    # node:sqlite, Transaktion pro Spiel
 |- NullStorage.ts      # Persistenz aus: macht nichts (Standard)
 |- schema.ts           # Migrationen
 |- result.ts           # GameStats + Avatare + Raum => GameResult (rein, ohne Datenbank)
src/shared/model/GameResult.ts   # das serialisierbare Ergebnis eines Spiels, auch für die API
```

- **`GameResult`** ist ein reines Datenobjekt: Spiel (Zeiten, Raum, Runden, Maximalpunkte, Konfiguration), Spieler
  (Name, Farbe, Rang, Punkte, Zähler, Token-Hash oder nichts) und Feats. Es wird aus `GameStats.serialize()` und den
  Avataren gebaut. `GameStats.serialize()` liefert das schon als reines Datenobjekt (der Todo-Punkt "serializable" ist damit der Sache nach erledigt).
- **Einhängen**: `Server` erzeugt den Speicher (je nach Konfiguration) und gibt ihn dem `RoomRepository`. Wenn ein Spiel
  entsteht (`Room.createGame`), hört der Speicher auf dessen `end`-Ereignis und ruft `saveGame(result)`.
- **Token**: Der `SocketClient` kennt das Token schon. Der Spieler-Datensatz bekommt den Hash (nicht das Token) in die
  Ergebnisdaten, `result.ts` bleibt damit frei von Sitzungslogik.
- **Fehler**: `saveGame` fängt alles. Bei einem Fehler wird geloggt und `curvytron_storage_errors_total` erhöht, das
  Spiel läuft weiter. Es gibt **keine** Wiederholung und keine Warteschlange: Ein verlorenes Spiel in der Statistik ist
  nicht schlimm, ein hängender Server schon.
- **Wann gespeichert wird**: nur bei mindestens 2 Spielern und mindestens einer beendeten Runde. Spiele, die ohne
  Sieger enden (alle gegangen), bekommen `completed = 0` und zählen nicht für Siege, aber für Runden und Zähler. Ein
  Spiel, das beim Absturz des Servers läuft, geht verloren (wir schreiben nicht pro Runde, das hält den Code klein).

## 7. Anzeige

### 7.1 Schnittstelle

Nur lesend, über HTTP und nicht über die Websocket, weil das Ergebnis ohne Verbindung zum Spiel abrufbar und
zwischenspeicherbar sein soll:

| Pfad                                  | Inhalt                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /api/games?limit=20&before=<id>` | Letzte Spiele mit Spielern und Feats                                                |
| `GET /api/games/:id`                  | Ein Spiel mit allen Zählern, Runden und Feats (gleiches Format wie `GameStatsData`) |
| `GET /api/leaderboard?by=wins`        | Bestenliste, nach `wins`, `winRate`, `roundsWon`, `kills`                           |
| `GET /api/records`                    | Rekorde                                                                             |
| `GET /api/me`                         | Eigene Summen und Feats; der Browser schickt sein Token im Header                   |
| `DELETE /api/me`                      | Eigene Daten löschen (Stufe 4)                                                      |

Es gibt Begrenzungen: höchstens 100 Ergebnisse pro Aufruf, eine Anfragebegrenzung pro Adresse, und der Zugriff auf
`/api/me` braucht das Token. Alle Abfragen laufen als vorbereitete Anweisungen (kein SQL aus Eingaben).

### 7.2 Die Seite `#/stats`

- **Bestenliste**: Siege, Siegquote, gewonnene Runden, Kills. Wer erst wenige Spiele hat (zum Beispiel unter 5),
  steht nicht in der Siegquote, sonst führt jeder mit einem Sieg aus einem Spiel.
- **Letzte Spiele**: die Liste, aufklappbar mit derselben Tabelle wie am Spielende. **`GameStats.vue` kann
  wiederverwendet werden**, weil das Format dasselbe ist.
- **Rekorde**: längste Serie, meiste Kills in einem Spiel, längstes Leben, meiste Gap runs, meiste Feats.
- **Meine Statistik**: Summen und eine Trophäenwand der **bereits erhaltenen Feats**. Nicht erhaltene werden nicht
  gezeigt, auch keine Platzhalter und keine Anzahl, damit die versteckten Feats versteckt bleiben.

### 7.3 Fairness der Bestenliste

Siege sind je nach Spielerzahl unterschiedlich schwer (gegen 1 Gegner oder gegen 7). Für den Anfang reichen einfache
Zahlen. Später kann ein **Rating** dazukommen (Elo oder ein Mehrspieler-Verfahren wie TrueSkill). Das ist eine eigene
Stufe, weil die Wahl des Verfahrens Diskussion braucht.

## 8. Betrieb, Tests, Risiken

### 8.1 Überwachung

- `curvytron_storage_games_saved_total`, `curvytron_storage_errors_total` und ein Histogramm der Schreibdauer in
  `/metrics`; ein Panel im Grafana-Dashboard.
- `/health` meldet den Zustand der Datenbank (`storage: ok | off | error`), ohne dass ein Fehler den Container als
  ungesund markiert (ein Spiel ist wichtiger als die Statistik).

### 8.2 Tests

- Einheitentests mit `new DatabaseSync(':memory:')`: Migration von 0 auf die letzte Version, eine Datei mit alter
  Version wird hochgezogen, Speichern in einer Transaktion (Abbruch lässt nichts zurück), Summen entsprechen der
  Neuberechnung, Rangfolge der Bestenliste, Löschen eines Spielers, Gäste.
- `result.ts` ist ohne Datenbank testbar (reine Funktion).
- Protokolltest: ein ganzes Spiel über Websocket, danach die HTTP-Schnittstelle abfragen.
- E2E: die Seite `#/stats` zeigt nach einem Spiel das Spiel an.
- CI läuft mit Node 22, `node:sqlite` ist dort verfügbar.

### 8.3 Risiken

| Risiko                                                    | Gegenmittel                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `node:sqlite` ändert sich                                 | Eine Datei dahinter austauschbar, Node-Version begrenzt, CI-Test        |
| Datenverlust beim Neuerzeugen des Containers              | Volume im Compose, deutlich dokumentiert, Sicherungsanleitung           |
| Datenschutz                                               | Aus als Standard, nur Hash, Löschfunktion, Erklärung auf der Seite      |
| Der Name allein ist kein Beweis (jeder kann jeden nehmen) | Anzeige zeigt Name im Spiel; die Zuordnung läuft über das Token         |
| Statistik ändert ihre Bedeutung                           | `stats_version`, "nicht erfasst" ≠ 0                                    |
| Migration geht schief                                     | Jede Migration in einer Transaktion, Sicherung vor dem Update empfehlen |
| Die Bestenliste lädt langsam                              | Summen in eigener Tabelle, Zwischenspeicher 30 s, Indizes               |

## 9. Reihenfolge

Jede Stufe ist ein eigener PR und für sich nützlich:

1. **Fundament**: Konfiguration, Schnittstelle `Storage`, `NullStorage`, `SqliteStorage` mit `games`, `game_players`,
   `rounds`, `feats`, Migrationen, `result.ts`, Speichern am Spielende, Metriken, Dockerfile und Volume, Anleitung.
   **Noch ohne Spieler-Identität und ohne Anzeige**, nur Speichern (Spieler sind Gäste). Damit sammeln wir schon Daten.
2. **Identität und Summen**: `players`, Token-Hash, `player_totals`, `storage:rebuild`.
3. **Anzeige**: die HTTP-Schnittstelle (ohne `/me`) und die Seite `#/stats` mit Bestenliste, Spielen und Rekorden.
4. **Persönliches**: `/api/me`, Trophäenwand, "Meine Daten löschen", Wiederherstellungscode.
5. **Später**: Rating, Werte pro Runde (das Todo "Values per round"), Grafana-Panels der Spieldaten, Aufbewahrung nach
   Tagen.

## 10. Was dieses Konzept nicht löst

- Spiele, die laufen, wenn der Server stirbt, sind weg.
- Verlauf über mehrere Server oder Geräte hinweg (kein Konto).
- Manipulationssicherheit: Wer das Token eines anderen kennt, spielt als er. Das ist beim Wiederverbinden schon so.

## 11. Offene Entscheidungen

1. **Identität**: Browser-Token (B, Vorschlag) oder lieber nur der Name (A)?
2. **Standard**: Persistenz zunächst aus (Vorschlag) oder gleich an?
3. **Sichtbarkeit**: Dürfen alle auf dem Server die Liste sehen (Vorschlag), oder soll es einen Schalter geben, mit dem
   man sich aus der öffentlichen Liste herausnimmt?
4. **Welche Spiele**: auch 2-Spieler-Spiele und Spiele, die ohne Sieger enden? (Vorschlag: ja, mit `completed`-Flag.)
5. **Aufbewahrung**: Alles behalten (Vorschlag) oder nach X Tagen löschen?
6. **`node:sqlite`** (Vorschlag) oder `better-sqlite3`?
7. **Sprache der Seite**: Englisch, wie der Rest der Oberfläche?
