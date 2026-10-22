# Persistenz – Konzept

Status: Entwurf, nichts ist umgesetzt. Dieses Dokument beantwortet, **was** gespeichert wird, **wo**, **wie** Spieler
erkannt werden und **in welchen Schritten** es gebaut wird. Die Entscheidungen des Spielleiters stehen in Abschnitt 11,
dort sind auch die noch offenen Fragen.

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

| Thema            | Entscheidung                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Speicher         | SQLite, über das eingebaute `node:sqlite` (kein natives Modul, keine neue Abhängigkeit)    |
| Wann schreiben   | Einmal pro Spiel, am Ende, in einer Transaktion, **alle** Spiele                           |
| Spieler erkennen | Anonym über einen **Identitätscode** im Browser, nur als Hash gespeichert, drehbar/setzbar |
| Gruppen          | Ein frei wählbares **Tag** pro Spiel (zum Beispiel `daily`), Auswertung auch pro Tag       |
| Zähler           | Als JSON pro Spieler und Spiel, damit neue Statistiken keine Migration brauchen            |
| Anzeige          | Nur lesende HTTP-Schnittstelle (`/api/...`) und eine Seite `#/stats`, englisch             |
| Versteckte Feats | Auf `#/stats` und in der Schnittstelle nur als **?**, der Server liefert sie unkenntlich   |
| Sichtbarkeit     | Jeder Spieler kann sich mit einem Schalter aus den öffentlichen Listen nehmen              |
| Fehler           | Ein Fehler der Datenbank darf nie ein Spiel stören: loggen, zählen, weiterspielen          |
| Standard         | **An** (`storage.enabled`), mit Volume im Compose                                          |
| Aufbewahrung     | Alles behalten, kein automatisches Löschen                                                 |
| Lieferung        | In fünf Stufen, jede ein eigener PR (Abschnitt 9)                                          |

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
{ "storage": { "enabled": true, "file": "data/curvytron.db" } }
```

- Die Umgebungsvariable `DATABASE_FILE` hat Vorrang vor der Konfiguration (wie `PORT`).
- Das Dockerfile legt `data/` an und gibt es dem Benutzer `node`. `docker-compose.yml` bekommt einen Volume
  `curvytron-data:/curvytron/data`, **sonst sind die Daten beim Neuerzeugen des Containers weg**. Das muss in der
  Anleitung (`doc/installation.md`) fett stehen.
- Lässt sich die Datei nicht öffnen (Rechte, voller Datenträger), läuft der Server mit `NullStorage` weiter und
  meldet es im Log und in `/health`. Ein Spiel ist wichtiger als die Statistik.
- Es gibt genau einen Server pro Datei. Mehrere Instanzen auf derselben Datei sind nicht vorgesehen.
- **Sicherung**: `sqlite3 data/curvytron.db ".backup backup.db"` oder `VACUUM INTO`. Ein Kopieren der Datei im laufenden
  Betrieb ist wegen WAL unsicher, das steht in der Anleitung.

### 3.3 Größe

Ein Spieler in einem Spiel braucht grob 0,5 bis 1 KB (Zähler als JSON), dazu etwas für Runden und Feats. Ein Spiel mit
5 Spielern sind etwa 5 KB. 10.000 Spiele sind 50 MB. Das ist für einen Freundeskreis kein Thema, deshalb bleibt alles erhalten und es gibt
kein automatisches Löschen.

## 4. Datenmodell

Versionierung der Tabellen über `PRAGMA user_version`. Die Migrationen sind eine Liste von SQL-Schritten in
`src/server/storage/schema.ts`, der Server führt beim Start die fehlenden aus.

### 4.1 Tabellen

```sql
-- Wer hat gespielt (anonym): ein Eintrag pro Browser
CREATE TABLE players (
    id          INTEGER PRIMARY KEY,
    identity_hash TEXT NOT NULL UNIQUE, -- SHA-256 des Identitätscodes (Abschnitt 5)
    name        TEXT NOT NULL,          -- zuletzt benutzter Name
    public      INTEGER NOT NULL DEFAULT 1,  -- 0: nicht in den öffentlichen Listen (5.4)
    created_at  INTEGER NOT NULL,       -- Unix-Zeit in ms
    last_seen   INTEGER NOT NULL
);

CREATE TABLE games (
    id            INTEGER PRIMARY KEY,
    started_at    INTEGER NOT NULL,
    ended_at      INTEGER NOT NULL,
    room          TEXT NOT NULL,
    mode          TEXT NOT NULL DEFAULT 'classic',
    tag           TEXT,                 -- Gruppe, zum Beispiel 'daily' (NULL: keine), siehe 4.5
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
CREATE INDEX games_tag ON games(tag, ended_at DESC);
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

### 4.5 Tags

Ein Tag gruppiert Spiele nach einem Anlass: `daily` für die Runden nach dem Daily, `launch` nach der
Produktvorstellung und so weiter. Er hat zwei Orte:

- **Raumeinstellungen**: Ein Textfeld "Tag (optional)" in den Raumparametern, nur der Spielleiter des Raums ändert es,
  wie die übrigen Einstellungen. Es ist Teil von `RoomConfig` (Server und Client) und damit für alle im Raum sichtbar.
- **Gespeichert** wird der Tag zum Zeitpunkt des Spielendes in `games.tag`.

Regeln: höchstens 24 Zeichen, nach dem Bereinigen nur `a-z`, `0-9` und `-` (aus "Daily Runde" wird `daily-runde`),
leer bedeutet "kein Tag". Das Feld schlägt die zuletzt benutzten Tags vor (`GET /api/tags`), damit nicht jeder eine
eigene Schreibweise erfindet. Die Seite `#/stats` filtert nach Tag (Bestenliste, Spiele, Rekorde), damit "die Daily-Runde"
eine eigene Rangliste hat.

Summen pro Tag werden nicht vorgehalten, sondern bei Bedarf aus `game_players` berechnet (für den Freundeskreis schnell
genug, dazu der Index `games_tag`). Die Gesamtsummen in `player_totals` bleiben die Abkürzung für "alle Spiele".

## 5. Spieler erkennen

Das ist die schwierigste Frage, weil das Spiel **keine Konten** hat. Bekannt sind ein Name, eine Farbe und ein
Sitzungs-Token (`src/client/core/session.ts`), mit dem der Server wiedererkennt, wer nach einem Verbindungsabbruch
zurückkommt.

**Entscheidung: Identität über einen Code im Browser**, der gedreht und gesetzt werden kann. Der Name allein
taugt nicht (jeder kann jeden Namen nehmen, Doppelte vermischen sich, eine Namensänderung bricht die Historie), Konten
sind zu viel (Aufwand, Passwörter, Datenschutz, passt nicht zum Spiel).

### 5.1 Ein eigener Identitätscode statt des Sitzungs-Tokens

Das Sitzungs-Token reist heute in der Adresse der Websocket (`?token=...&tab=...`). Dort landet es in den Zugriffsprotokollen
von Reverse-Proxys (nginx und andere). Für das Wiederverbinden ist das harmlos, für eine **Identität mit Historie** nicht:
Wer ein Protokoll liest, könnte als dieser Spieler auftreten.

Darum bekommt die Identität einen **eigenen Code**, getrennt vom Sitzungs-Token:

|                                 | Sitzungs-Token (besteht)                  | Identitätscode (neu)                                                                  |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Wofür                           | Wiederverbinden zu einem laufenden Spiel  | Wer ich bin, für Statistik und Bestenliste                                            |
| Wo im Browser                   | `localStorage`, `curvytron.token`         | `localStorage`, `curvytron.identity`                                                  |
| Wie übertragen                  | In der Adresse der Websocket (wie bisher) | **Nie in der Adresse**: als Nachricht nach dem Verbinden und als Header bei `/api/me` |
| Auf dem Server                  | Im Speicher, `SocketClient.token`         | Nur als `SHA-256` in `players.identity_hash`                                          |
| Zwei Browser mit demselben Wert | Würde Sitzungen verwechseln               | Unkritisch: zwei Browser, zwei Verbindungen, ein Spieler                              |

Der Code ist eine zufällige UUID mit hoher Entropie, ein einfacher SHA-256 reicht (kein Passwort-Hash nötig).

### 5.2 Drehen und Setzen

Im Profil gibt es einen Abschnitt **"Your identity"**:

- **Show code** / **Copy**: der Code, versteckt, bis man ihn anzeigt (er ist ein Geheimnis wie ein Passwort).
- **Use another code**: Code einfügen, zum Beispiel aus einem anderen Browser, und ab dann dieser Spieler sein.
  Der Server kennt den Hash und ordnet alles dieser Identität zu. Ist der Hash unbekannt, ist es einfach eine neue
  Identität mit diesem Code.
- **New code (keep my history)**: **Drehen**. Der Browser schickt den alten und den neuen Code, der Server beweist
  den alten über den Hash und ersetzt ihn durch den Hash des neuen. Der alte Code ist danach wertlos. Das ist die
  Antwort, falls ein Code irgendwo gelandet ist, wo er nicht hingehört.
- **Start fresh**: nur den Code im Browser löschen und einen neuen anlegen, **ohne** Verbindung zum alten. Die alten
  Daten bleiben unter der alten Identität.

Auf dem Server sind das zwei Aufrufe, `POST /api/me/rotate` und die normale Anmeldung mit einem gesetzten Code
(Abschnitt 7.1). Gedreht wird **nicht** mitten im Spiel: die Schaltfläche steht nur im Profil, das während eines
Spiels nicht erreichbar ist.

### 5.3 Wer wird gezählt

- Pro Browser gibt es einen Eintrag in `players`. Der Name wird bei jedem Spiel aktualisiert. In `game_players` steht
  der **Name im Spiel**, damit alte Spiele so aussehen, wie sie waren.
- **Mehrere Spieler an einem Gerät** (lokale Spieler im selben Raum) teilen sich einen Code. Nur der erste lokale
  Spieler wird der Identität zugeordnet, die weiteren zählen als **Gäste** (`player_id = NULL`). Sie stehen im Verlauf,
  aber nicht in der Bestenliste.
- **Verlorene Identität**: Löscht jemand den Browser-Speicher, ist er ein neuer Spieler, solange er den Code nicht
  gesichert hat. Der Abschnitt "Your identity" weist darauf hin ("Copy this code and keep it, or you lose your history").

### 5.4 Datenschutz und Sichtbarkeit

Name und Identitäts-Hash gelten schon in einem Freundeskreis als personenbezogene Daten. Deshalb:

- **Schalter "Show me in public lists"** im Profil (Standard: an). Aus bedeutet: Der Name erscheint in der Bestenliste,
  den Rekorden und der Spieleliste als **"Anonymous"**, und die Bestenliste führt den Spieler nicht mehr. Die Spiele
  selbst bleiben gespeichert (sonst fehlen den anderen Ergebnisse), die Zuordnung läuft im Server über `players.public`
  und gilt **rückwirkend**: Wer den Schalter später ausschaltet, verschwindet auch aus alten Spielen. Gäste
  (weitere lokale Spieler) können sich nicht herausnehmen.
- **"Delete my data"** (Stufe 4): löscht den `players`-Eintrag; die Spiele bleiben, der Spieler darin wird zum Gast
  (`ON DELETE SET NULL`) und sein Name im Spiel wird durch "Anonymous" ersetzt.
- Die Seite `#/stats` sagt klar, **was** gespeichert wird und **für wen** es sichtbar ist (alle, die den Server
  erreichen), und verlinkt auf den Schalter.
- Keine IP-Adressen, keine Browser-Kennungen außer dem Identitäts-Hash.

## 6. Aufbau im Code

```
src/server/storage/
 |- Storage.ts          # Schnittstelle: saveGame, leaderboard, recentGames, player, deletePlayer, close
 |- SqliteStorage.ts    # node:sqlite, Transaktion pro Spiel
 |- NullStorage.ts      # Persistenz aus oder nicht erreichbar: macht nichts
 |- schema.ts           # Migrationen
 |- result.ts           # GameStats + Avatare + Raum => GameResult (rein, ohne Datenbank)
src/shared/model/GameResult.ts   # das serialisierbare Ergebnis eines Spiels, auch für die API
```

- **`GameResult`** ist ein reines Datenobjekt: Spiel (Zeiten, Raum, Runden, Maximalpunkte, Konfiguration), Spieler
  (Name, Farbe, Rang, Punkte, Zähler, Token-Hash oder nichts) und Feats. Es wird aus `GameStats.serialize()` und den
  Avataren gebaut. `GameStats.serialize()` liefert das schon als reines Datenobjekt (der Todo-Punkt "serializable" ist damit der Sache nach erledigt).
- **Tag**: `RoomConfig` bekommt das Feld `tag` (Server und Client, validiert wie die übrigen Felder), `result.ts` nimmt
  es beim Spielende aus der Konfiguration.
- **Einhängen**: `Server` erzeugt den Speicher (je nach Konfiguration) und gibt ihn dem `RoomRepository`. Wenn ein Spiel
  entsteht (`Room.createGame`), hört der Speicher auf dessen `end`-Ereignis und ruft `saveGame(result)`.
- **Identität**: Der Client schickt den Identitätscode nach dem Verbinden als Nachricht (nicht in der Adresse, 5.1), der
  Server hängt den **Hash** an den `SocketClient`. Der Spieler-Datensatz bekommt diesen Hash in die Ergebnisdaten,
  `result.ts` bleibt damit frei von Sitzungslogik und kennt nie den Code selbst.
- **Fehler**: `saveGame` fängt alles. Bei einem Fehler wird geloggt und `curvytron_storage_errors_total` erhöht, das
  Spiel läuft weiter. Es gibt **keine** Wiederholung und keine Warteschlange: Ein verlorenes Spiel in der Statistik ist
  nicht schlimm, ein hängender Server schon.
- **Wann gespeichert wird**: **alle** Spiele mit mindestens einer beendeten Runde (auch zu zweit). Spiele, die ohne
  Sieger enden (alle gegangen), bekommen `completed = 0` und zählen nicht für Siege, aber für Runden und Zähler. Ein
  Spiel, das beim Absturz des Servers läuft, geht verloren (wir schreiben nicht pro Runde, das hält den Code klein).

## 7. Anzeige

### 7.1 Schnittstelle

Nur lesend, über HTTP und nicht über die Websocket, weil das Ergebnis ohne Verbindung zum Spiel abrufbar und
zwischenspeicherbar sein soll. `games`, `leaderboard` und `records` nehmen `tag=<tag>` als Filter:

| Pfad                                  | Inhalt                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /api/games?limit=20&before=<id>` | Letzte Spiele mit Spielern und Feats                                                |
| `GET /api/games/:id`                  | Ein Spiel mit allen Zählern, Runden und Feats (gleiches Format wie `GameStatsData`) |
| `GET /api/leaderboard?by=wins`        | Bestenliste, nach `wins`, `winRate`, `roundsWon`, `kills`                           |
| `GET /api/records`                    | Rekorde                                                                             |
| `GET /api/tags`                       | Verwendete Tags mit Anzahl der Spiele                                               |
| `GET /api/me`                         | Eigene Summen und **alle eigenen Feats**; der Browser schickt den Code im Header    |
| `POST /api/me`                        | Einstellungen: `public` (Schalter)                                                  |
| `POST /api/me/rotate`                 | Code drehen (alter Code im Header, neuer im Inhalt)                                 |
| `DELETE /api/me`                      | Eigene Daten löschen (Stufe 4)                                                      |

Es gibt Begrenzungen: höchstens 100 Ergebnisse pro Aufruf, eine Anfragebegrenzung pro Adresse, und der Zugriff auf
`/api/me` braucht den Identitätscode (nur im Header, nie in der Adresse). Alle Abfragen laufen als vorbereitete Anweisungen (kein SQL aus Eingaben).

### 7.2 Die Seite `#/stats`

- **Bestenliste**: Siege, Siegquote, gewonnene Runden, Kills. Wer erst wenige Spiele hat (zum Beispiel unter 5),
  steht nicht in der Siegquote, sonst führt jeder mit einem Sieg aus einem Spiel.
- **Letzte Spiele**: die Liste, aufklappbar mit derselben Tabelle wie am Spielende. **`GameStats.vue` kann
  wiederverwendet werden**, weil das Format dasselbe ist.
- **Rekorde**: längste Serie, meiste Kills in einem Spiel, längstes Leben, meiste Gap runs, meiste Feats.
- **Meine Statistik**: Summen und die Feats, die ich erhalten habe (siehe 7.4).
- **Filter**: ein Feld "Tag" oberhalb von allem; "all games" ist der Standard.

### 7.3 Versteckte Feats

Die Feats sollen in den Listen **nicht** verraten, was sie sind. Das gilt für die Seite **und** für die Daten:

- Auf `#/stats` erscheint ein erhaltenes Feat nur als **"?"**: mit der Runde und dem Spieler, aber ohne Namen und
  ohne Beschreibung. So sieht man, **dass** etwas passiert ist, aber nicht, was.
- Der Server liefert **keine Feat-Kennung** an die Listen und Spiele der Schnittstelle (`/api/games`,
  `/api/leaderboard`, `/api/records`, `/api/games/:id`). Er sendet `{ "round": 3, "player": 2, "hidden": true }`.
  Ein Blick in die Netzwerkanzeige des Browsers verrät also nichts. Die Kennungen (`cleanSweep` und so weiter) stehen
  nur in der Datenbank.
- In den **Rekorden** gibt es keinen Rekord, der ein Feat nennt (zum Beispiel "meiste Clean sweeps"), sondern nur
  "meiste Feats" als Zahl.
- Die Feats **im Spiel** (am Rundenende und Spielende) ändern sich nicht: Dort sehen die Mitspielenden Namen und
  Beschreibung, das ist der Moment, in dem man sie entdecken soll.

### 7.4 Die eigenen Feats (offen)

Soll ich mir meine **eigenen** erhaltenen Feats später mit Namen ansehen können (`GET /api/me`)? Dafür spricht: Man
hat sie im Spiel schon gesehen, und es wäre schade, sie nur noch als "?" zu haben. Dagegen spricht: Wer ein Feat nie
bemerkt hat, würde es hier erfahren. Mein Vorschlag: In `GET /api/me` stehen die eigenen Feats **mit** Namen, und alle
anderen sehen "?". Das ist eine Entscheidung (Abschnitt 11, Frage 8).

### 7.5 Fairness der Bestenliste

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

| Risiko                                                    | Gegenmittel                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `node:sqlite` ändert sich                                 | Eine Datei dahinter austauschbar, Node-Version begrenzt, CI-Test                       |
| Datenverlust beim Neuerzeugen des Containers              | Volume im Compose, deutlich dokumentiert, Sicherungsanleitung                          |
| Datenschutz                                               | Nur Hash, Schalter für die öffentlichen Listen, Löschfunktion, Erklärung auf der Seite |
| Identitätscode landet in einem Proxy-Protokoll            | Eigener Code, nie in der Adresse, nur als Nachricht oder Header; drehbar               |
| Code geht verloren (Browser-Speicher gelöscht)            | Hinweis im Profil: Code sichern; "Use another code" stellt ihn wieder her              |
| Tags werden unterschiedlich geschrieben                   | Bereinigung (Kleinbuchstaben, `-`), Vorschläge aus `/api/tags`                         |
| Der Name allein ist kein Beweis (jeder kann jeden nehmen) | Anzeige zeigt Name im Spiel; die Zuordnung läuft über das Token                        |
| Statistik ändert ihre Bedeutung                           | `stats_version`, "nicht erfasst" ≠ 0                                                   |
| Migration geht schief                                     | Jede Migration in einer Transaktion, Sicherung vor dem Update empfehlen                |
| Die Bestenliste lädt langsam                              | Summen in eigener Tabelle, Zwischenspeicher 30 s, Indizes                              |

## 9. Reihenfolge

Jede Stufe ist ein eigener PR und für sich nützlich:

1. **Fundament**: Konfiguration (an), Schnittstelle `Storage`, `NullStorage`, `SqliteStorage` mit `games`, `game_players`,
   `rounds`, `feats`, Migrationen, `result.ts`, Speichern am Spielende, **Tag in den Raumeinstellungen**, Metriken,
   Dockerfile und Volume, Anleitung. **Noch ohne Spieler-Identität und ohne Anzeige**, nur Speichern (Spieler sind
   Gäste). Damit sammeln wir schon Daten, und die Tags sind von Anfang an dabei.
2. **Identität und Summen**: Identitätscode im Browser, Nachricht nach dem Verbinden, `players`, `player_totals`,
   `storage:rebuild`.
3. **Anzeige**: die HTTP-Schnittstelle (ohne `/me`) und die Seite `#/stats` mit Bestenliste, Spielen und Rekorden,
   Tag-Filter und **versteckten Feats als "?"**.
4. **Persönliches**: `/api/me`, Abschnitt "Your identity" (anzeigen, setzen, drehen, neu anfangen), Schalter "Show me
   in public lists", "Delete my data", eigene Feats.
5. **Später**: Rating, Werte pro Runde (das Todo "Values per round"), Grafana-Panels der Spieldaten.

## 10. Was dieses Konzept nicht löst

- Spiele, die laufen, wenn der Server stirbt, sind weg.
- Verlauf über mehrere Server oder Geräte hinweg (kein Konto).
- Manipulationssicherheit: Wer das Token eines anderen kennt, spielt als er. Das ist beim Wiederverbinden schon so.

## 11. Entscheidungen

| Frage             | Entscheidung                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Identität         | Browser-Code, mit Möglichkeit zum Drehen und Setzen (für einen anderen Browser); als **eigener** Code, nicht das Sitzungs-Token (5.1) |
| Standard          | Direkt an                                                                                                                             |
| Sichtbarkeit      | Mit Schalter, der Name wird zu "Anonymous" (5.4)                                                                                      |
| Welche Spiele     | Alle, auch zu zweit und ohne Sieger; dazu ein **Tag** zum Gruppieren (4.5)                                                            |
| Aufbewahrung      | Alles behalten                                                                                                                        |
| Datenbank         | `node:sqlite`                                                                                                                         |
| Sprache der Seite | Englisch                                                                                                                              |
| Versteckte Feats  | Auf `#/stats` und in der Schnittstelle nur als "?" (7.3)                                                                              |

### Noch offen

8. **Eigene Feats mit Namen?** In `GET /api/me` mit Namen (Vorschlag) oder auch für mich nur als "?" (7.4)?
9. **"Anonymous"**: Ein Spieler, der sich aus den Listen nimmt, steht überall als "Anonymous" (Vorschlag). Alternative:
   Er erscheint mit seinem Namen im Verlauf der Spiele, aber nicht in Bestenliste und Rekorden. Welche?
10. **Tag nachträglich ändern**: Soll man den Tag eines abgeschlossenen Spiels später ändern können (zum Beispiel, wenn
    man ihn vergessen hat)? Mein Vorschlag: nein in Stufe 1, vielleicht später für den Spielleiter eines Raums.
11. **Wer darf den Tag setzen**: nur der Spielleiter des Raums (Vorschlag), oder jeder Spieler?
