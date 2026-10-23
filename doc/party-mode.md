# Star Chase – Game Design Document

Status: Entwurf, nichts ist umgesetzt.

## 1. Überblick

Der **Star Chase** (Arbeitstitel auf Deutsch: Star Chase) ist ein alternativer Spielmodus für Curvytron. Er ändert die Wertung, nicht die Steuerung und nicht
das Fahrgefühl. Gutes Fahren bleibt die Grundlage, reicht aber nicht allein zum Sieg: Wer gewinnen will, muss sich auch
um Rundenmissionen kümmern, kleine Sterne auf dem Spielfeld einsammeln und dafür Risiken eingehen. Das Vorbild sind
Spiele wie Mario Party, in denen Sterne und Bonuspunkte den Ausgang bis zum Schluss offen halten.

**Designziele**

- Risiko und Aufmerksamkeit werden belohnt, nicht nur Überleben.
- Das Ergebnis bleibt bis zur letzten Runde offen.
- Jeder sieht jederzeit, wofür es gerade Punkte gibt und wie er dasteht.
- Es gibt weiterhin **eine einzige Punktzahl**. Rangliste, Spielerliste und Spielende funktionieren wie im klassischen
  Modus. Die Sterne sind eine Punktequelle mit hohem Wert, keine zweite Währung.

**Einstellungen des Spielleiters** (vor dem Spiel, im Raum):

| Einstellung | Werte | Standard |
|---|---|---|
| Modus (Wertung) | Klassisch, Star Chase | Klassisch |
| Siegbedingung | Rundenzahl, Zeitlimit oder Punktelimit | Star Chase: 8 Runden; Klassisch: Punktelimit wie bisher |

Modus und Siegbedingung sind unabhängig: Alle Siegbedingungen sind in beiden Modi wählbar. Die Dauer eines Spiels soll
bei etwa 15 Minuten liegen (siehe Abschnitt 6).

## 2. Spielablauf einer Runde

1. **Start**: Zwei Missionen werden gezogen und allen gezeigt (Spieler, Tote und Zuschauer). Die normale Aufwärmphase
   (`warmupTime`, 3 s) läuft wie bisher.
2. **Runde**: Alle fahren. Während der Runde stehen die Missionen mit Live-Stand am Rand, Sterne erscheinen auf dem
   Spielfeld. Punkte für Platzierung gibt es wie im klassischen Modus.
3. **Ende**: Sobald nur noch einer lebt, endet die Runde. Die Missionen werden ausgewertet, die Sterne vergeben.
4. **Zwischenstand**: Ein Overlay zeigt die Aufschlüsselung der Punkte jedes Spielers (Platzierung, Missionen, gesammelte
   Sterne) und den Gesamtstand. Die Pause (`warmdownTime`) beträgt in der Star Chase **8 s**.
5. **Nächste Runde** oder Spielende nach der Siegbedingung.

## 3. Punktequellen

| Quelle | Punkte |
|---|---|
| Platzierung in der Runde | wie im klassischen Modus (Reihenfolge der Tode, Rundensieger n-1) |
| Mission gewonnen | ⌈u/2⌉, mindestens 1 |
| Stern aufgesammelt | ⌈u/3⌉, mindestens 1 |

Dabei ist n die Zahl der Spieler und u = n-1 der Wert eines Rundensiegs. Die Werte wachsen mit der Spielerzahl, denn
die Platzierung tut es auch: Bei 20 Spielern ist der Rundensieg 19 Punkte wert und benachbarte Plätze unterscheiden sich
um 1 Punkt, feste Werte wie 2 oder 3 wären dort kaum spürbar, bei 2 Spielern dagegen dominant.

| Spieler | Rundensieg | Mission | Stern |
|---|---|---|---|
| 2 | 1 | 1 | 1 |
| 4 | 3 | 2 | 1 |
| 6 | 5 | 3 | 2 |
| 10 | 9 | 5 | 3 |
| 20 | 19 | 10 | 7 |

Ein Stern allein entscheidet eine Runde nicht, aber zwei Sterne oder eine Mission plus ein Stern können den Rundensieg
aufwiegen. Die Faktoren (½ und ⅓) sind Startwerte und werden nach den ersten Testspielen angepasst.

Beim **Finale** (siehe Abschnitt 6) zählt jede Quelle doppelt.

## 4. Rundenmissionen

### 4.1 Regeln

- Zu jeder Runde werden 2 verschiedene Missionen aus dem Pool gezogen, ab 10 Spielern 3, damit mehr Leute etwas zu jagen
  haben. Sie sind vor der Runde bekannt und ändern das
  Verhalten: Man fährt nah an Trails oder jagt Bonis, obwohl man sonst sicher fahren würde.
- Es gewinnt der Spieler mit dem besten Wert der Mission. Bei Gleichstand bekommen alle Gleichplatzierten den Stern. Bei
  Wert 0 bekommt niemand einen.
- Alle Missionen sind gleich viel wert, die Schwierigkeit gleicht sich selbst aus, weil man sich nur mit den anderen
  Spielern vergleicht.
- Jede Mission zählt pro Runde für einen Spieler nur einmal. Dieselbe Mission kann in späteren Runden wieder gezogen
  werden, aber nicht in der direkt folgenden.
- Die Ziehung richtet sich auch nach den Bonis des Raums: „Sammler" braucht mindestens einen aktiven Bonus, „Saboteur"
  mindestens zwei aktive schädliche Bonis (`harmfulBonuses` in `src/shared/missions.ts`: die Bonis der anderen, die
  schneller, dicker, invertiert oder eckig machen; die langsamen helfen dem Getroffenen und zählen nicht, die Leader-Bonis
  auch nicht: sie treffen nur den Führenden, der dafür auch noch eine Mission bekäme).
- Die Ziehung richtet sich nach der Spielerzahl: Missionen, die mit wenigen Spielern sinnlos sind (zum Beispiel
  Nadelöhr), werden dann nicht gezogen. Bei 2 Spielern wird nur 1 Mission gezogen.
- Nichts zählt, solange ein Avatar unverwundbar ist (wie bei den Statistiken); gemeint sind Beinahe-Treffer, Engstellen,
  Wandzeit, Strecke und Bonis (Kills zählen, sie stammen aus dem Trail). Pro Mission und Runde gibt es einen Deckel für
  den Zähler, damit sich Werte nicht absichtlich hochtreiben lassen (Startwerte in `src/shared/missions.ts`: Nahkampf 15,
  Nadelöhr 10, Sammler 8, Jäger 10, Wandläufer 60 s, Saboteur 6).

### 4.2 Pool

| Mission | Gewinnt, wer … |
|---|---|
| Nahkampf | die meisten Beinahe-Treffer (Near Misses) hat |
| Nadelöhr | die meisten Engstellen (Squeezes) durchfährt |
| Sammler | die meisten Bonis einsammelt |
| Jäger | die meisten Kills auf den eigenen Trail erzielt |
| Wandläufer | am längsten nah an der Wand fährt, ohne zu sterben |
| Marathon | die längste Strecke fährt |
| Kamikaze | als Erster stirbt, dabei aber jemanden mitnimmt |
| Comeback | die Runde gewinnt, nachdem er in der Runde davor Letzter war |
| Saboteur | die meisten schädlichen Bonis einsammelt (die alle anderen treffen, siehe 4.1) |

### 4.3 Anzeige während der Runde

Die Missionen stehen die ganze Runde über klein am Rand des Spielfelds, auch für Tote und Zuschauer. Sie lenken nicht vom
Spielfeld ab: Nur der Stand ändert sich.

- Je Mission: Name, kurze Beschreibung, der eigene Wert und der Wert des Führenden, zum Beispiel „du: 3 · Anna führt mit 5".
- Status je Mission: **führt** (der Stern wäre jetzt deiner), **gleichauf** oder **hinten** (mit Abstand zum Führenden).
  Es wird bewusst nie angezeigt, dass jemand „keine Chance mehr" hat: Das würde nur demotivieren.
- Ja/Nein-Missionen (Kamikaze, Comeback) zeigen „offen", „geschafft" oder „verpasst".
- Wer gerade einen Stern halten würde, trägt einen kleinen Stern neben dem Namen in der Spielerliste.
- Am Rundenende zeigt das Overlay das Ergebnis jeder Mission und wer den Stern bekommen hat.

## 5. Stern-Item

Der Stern ist ein eigener Bonus-Typ ohne Effekt (er wird über das Bonus-Registry angelegt, siehe `doc/bonuses.md`). Wer
ihn einsammelt, bekommt sofort ⌈u/3⌉ Punkte (siehe Abschnitt 3).

- **Größe**: kleiner als die normalen Bonis, man muss genauer treffen. Die Größe ist daher pro Bonus-Typ einstellbar
  (`BaseBonus.radius` ist heute für alle gleich).
- **Anzahl**: selten und begrenzt, abhängig von der Spielerzahl: `aufgerundet(Spieler / 2)`, höchstens 3 pro Runde (2
  Spieler: 1, 3–4 Spieler: 2), ab 10 Spielern höchstens 5. Die Sterne erscheinen zeitlich verteilt, nicht alle auf einmal.
- **Platzierung**: bewusst an riskanten Orten, nah an der Wand oder an Trails, nicht gleichverteilt wie die normalen Bonis
  (eigene Platzierung neben `BonusManager.getRandomPosition`).
- **Lebensdauer**: Der Stern verschwindet nach einer Zeit wieder. Sie beträgt mindestens 10 s und wächst mit der
  Kartengröße: `10 s · Kartengröße / Kartengröße für 2 Spieler` (bei 2 Spielern 10 s, bei 4 etwa 11,5 s, bei 8 etwa
  14 s).
- **Anzeige**: Ein Ring um den Stern zeigt die Restzeit und wird immer kleiner (Fortschrittsanzeige als Ring).

## 6. Siegbedingung

Die Dauer eines Spiels soll bei etwa 15 Minuten liegen. Die Länge einer Runde schwankt stark (manche Runden sind sofort
vorbei, andere ziehen sich), und sie hängt von der Spielerzahl und der Kartengröße ab. Deshalb gibt es drei
Siegbedingungen:

- **Feste Rundenzahl** (Standard in der Star Chase: 8 Runden, als Startwert): Der Ausgang bleibt bis zum Schluss offen,
  weil Sterne alles drehen können. Es gilt das Finale. Bei Gleichstand nach der letzten Runde folgt eine Stichrunde.
  In ihr spielen alle mit (die anderen sind Hindernisse), punkten aber nur die Gleichplatzierten, ohne Finale. Bleibt es
  gleich, folgt die nächste Stichrunde.
- **Zeitlimit** (Standard 15 Minuten): Eine Runde wird nie abgebrochen. Die letzte Runde ist die erste, die mit weniger
  Restzeit beginnt, als eine Runde im Schnitt dauert (die bisherigen Runden samt Pausen, am Anfang 60 s plus Pausen). Sie
  steht beim Start fest und wird angesagt, danach endet das Spiel. Das Finale gilt für sie und für die Runde davor, die mit
  weniger als zwei Rundenlängen Restzeit beginnt. Die Dauer stimmt unabhängig von Spielerzahl und Rundenlänge, die Zahl der
  Runden liegt nicht fest. Es gilt das Finale. Gleichstand wie bei der festen Rundenzahl.
- **Punktelimit**: wie heute (`maxScore`), kein Finale. Der Standardwert `(n-1)·10` ergibt für einen durchschnittlichen
  Spieler etwa 20 Runden und ist für 15 Minuten zu hoch. In der Star Chase, wo die Sonderpunkte den Stand zusätzlich
  anheben, ist der Standardwert niedriger gewählt. Der klassische Modus bleibt unverändert.

**Finale**: In den letzten 2 Runden zählt jede Punktequelle doppelt. Das gilt bei fester Rundenzahl und beim Zeitlimit.

**Rundenzeiten**: Die Standardwerte (8 Runden, 15 Minuten, Punktelimit) sind Startwerte. Es wird erfasst, wie lange eine
Runde dauert, in Verbindung mit Spielerzahl und Kartengröße (siehe 8.2), und die Werte werden danach angepasst.

## 7. Erweiterungen (nicht Teil der ersten Version)

| Idee | Wirkung | Aufwand |
|---|---|---|
| Ziel-Missionen („schaffe mindestens …"), gestaffelt in Bronze / Silber / Gold (1 / 2 / 3 Punkte) | leichte Ziele geben weniger, schwere mehr | mittel (feste Schwellen aus Spieldaten) |
| Hilfe für die Letzten: bessere Bonus-Chancen über `getProbability` | kein Frust, enge Rennen | gering |
| Dieb-Bonus: nimmt dem Führenden 1 Punkt | Dramatik | mittel |
| Chaos-Runde (alle paar Sekunden ein zufälliger Bonus-Effekt) | Abwechslung | mittel |
| Versteckte Mission (nur für einen Spieler sichtbar) | Mario-Party-Gefühl | höher |
| Wetten: vor der Runde 1 Punkt auf den Rundensieger setzen | auch Tote bleiben beteiligt | höher |

Der Führende trägt wie bisher einen goldenen Rand (`Game.onRoundNew`), das bleibt in beiden Modi.

## 8. Technische Umsetzung

### 8.1 Ausgangslage im Code

- **Punkte**: `Game.kill` vergibt Punkte nach der Reihenfolge der Tode, `resolveScores` addiert n-1 für den Rundensieger,
  `isWon` prüft `maxScore`.
- **Bonis**: `BonusManager.testCatch` löst `bonus:catch` aus, `GameStats` hört darauf.
- **Statistiken**: `GameStats` (`src/server/service/GameStats.ts`) zählt über das ganze Spiel. Near Misses, Squeezes und
  Gap Runs gibt es (`testSurroundings`), ebenso `kills` und `graveKills`. Pro Runde gibt es nur Sieger und Dauer.
- **Feats**: `Feats.ts` misst schon Wandnähe (`wallRiderRadii`, `wallRiderTime`), Zustand über Runden hinweg
  (`lastPacifist`, `firstDeaths`) und Bonus-Fänge. Das sind Ja/Nein-Feats, keine Zähler.
- **Speicherung** (SQLite, `src/server/storage`): Tabellen `games` (mit `mode`, Standard `classic`), `game_players`
  (Zähler als `stats_json`), `rounds` (`duration_ms`, Sieger) und `feats`. `result.ts` setzt `mode` heute fest auf
  `'classic'`. `statsVersion` ist 2. Die Spielerzahl ergibt sich aus `game_players`.
- **Raum-Einstellungen**: Der Tag ist das fertige Muster für eine Einstellung des Raum-Masters: `room:config:tag`
  (`protocol.ts`), `RoomController.onConfigTag`, `Room.setTag`, `RoomParameters.vue` und `RoomRepository.setConfigTag`.
- **Anzeige**: `PlayerList.vue` zeigt `+roundScore` und `score`.
- **Pausen**: `warmupTime = 3000`, `warmdownTime = 5000` in `BaseGame`.

### 8.2 Bausteine

0. **Kartengröße pro Runde**: Rundendauer und Spielerzahl werden schon gespeichert. Es fehlt die Kartengröße, entweder
   als Spalte in `rounds` (Migration) oder als Metrik (`doc/monitoring.md`). Damit lassen sich die Standardwerte per
   SQL aus echten Spielen ableiten. Klein, auch ohne den neuen Modus nützlich.
1. **Zähler pro Runde**: `GameStats` bekommt je Spieler ein `round`-Objekt, das in `onRoundStart` zurückgesetzt wird (der
   offene Punkt „Werte pro Runde" in `doc/todo.md`). Es ist reiner Laufzeitzustand und wird nicht in `stats_json`
   geschrieben, `statsVersion` bleibt unverändert. Es wird an derselben Stelle gefüllt wie die Gesamtzähler (in `onDie`
   vor `feats.die`). Zähler: Nahbeinahe, Engstellen, Bonis, Kills, Strecke, Zeit nah an der Wand, Platz in der Runde,
   Reihenfolge der Tode, eingesammelte schädliche Bonis. Feat und Mission nutzen denselben Wandabstand
   (`wallRiderRadii`), aber nicht dieselbe Dauer: Die Mission zählt die Gesamtzeit.
2. **Wertung als Strategie**: Ein Interface `ScoringMode` (`classic`, `starchase`) mit den Hooks `onKill`, `onBonusCatch`
   und `onRoundEnd`. `Game.resolveScores` und `isWon` geben dorthin ab, die Siegbedingung ist davon getrennt. Der
   klassische Modus bleibt unverändert.
3. **Missions-Modul**: Pool, Ziehung abhängig von der Spielerzahl, laufender Stand (Werte aller Spieler, Führender und
   Status je Spieler) und Auswertung am Rundenende.
4. **Raum-Einstellung**: Modus (`classic` / `starchase`) und Siegbedingung (Runden, Zeit oder Punkte, mit Wert) in
   `BaseRoomConfig` und in den Raumparametern, nach dem Muster des Tags (`room:config:mode`, `room:config:win`, nur für
   den Raum-Master, Weitergabe in die Raumliste). `result.ts` nimmt `mode` aus dem Raum statt der Konstante. Der Schlüssel
   steht in `games.mode` und ist schwer zu ändern, er wird vor dieser Stufe festgelegt. Die Pause von 8 s wird im Modus
   gesetzt, nicht global.
5. **Stern-Bonus**: eigener Radius pro Typ, eigene Platzierung, Begrenzung nach Spielerzahl, Wert nach Spielerzahl,
   Lebensdauer mit Entfernen durch den Server (`bonus:clear` gibt es bereits).
6. **Protokoll** (`src/shared/protocol.ts`):
   - `round:missions` (Rundenstart),
   - `mission:progress` (laufender Stand, nur wenn sich ein Wert ändert; Strecke und Wandzeit höchstens einmal pro
     Sekunde, damit nicht jeder Frame etwas sendet),
   - `round:summary` (Ende, mit Ergebnis der Missionen und Aufschlüsselung pro Spieler),
   - Lebensdauer im Event, mit dem der Stern erscheint.

   Reconnect und Late Join führen den Zustand mit: Wer mitten in der Runde zurückkommt, sieht die aktuellen Missionen
   samt Stand und die Ringe der Sterne mit ihrer Restzeit. `present` / `away` bleiben bei der Auswertung richtig.
7. **Client**: Missionsanzeige mit Live-Status (neue Komponente neben `PlayerList.vue`), Overlay zwischen den Runden,
   Sprite und Ring-Timer des Sterns (`npm run sprite`), Einstellungen in den Raumparametern.

### 8.3 Tests

- Missionen mit Gleichstand und mit Wert 0.
- Spieler, die gehen oder kommen, und Reconnect mitten in der Runde (Missionsstand und Sterne mit Restzeit).
- Der laufende Stand wird gegen die Endauswertung geprüft (wer am Ende führt, bekommt den Stern).
- Werte von Mission und Stern für verschiedene Spielerzahlen (2, 4, 6, 10, 20) und Sterndeckel.
- Finale (doppelte Punkte), Stichrunde und Zeitlimit (die laufende Runde wird zu Ende gespielt, die letzte Runde wird
  angesagt).
- Der klassische Modus liefert dieselben Punkte wie vorher.
- Ein e2e-Lauf der Star Chase.

### 8.4 Reihenfolge

1. Zähler pro Runde, dazu die Kartengröße pro Runde (beides auch ohne den neuen Modus nützlich). **Erledigt.**
2. Interface `ScoringMode`, der klassische Modus dahinter, unverändert und getestet; die Siegbedingung getrennt davon
   (`src/server/scoring`). **Erledigt.**
3. Raum-Einstellungen für Modus (`room:config:mode`) und Siegbedingung (`room:config:win`) mit Rundenzahl, Zeitlimit,
   Finale und Stichrunde, in beiden Modi nutzbar. **Erledigt.**
4. Missionen mit Protokoll (`round:missions`, `mission:progress`, `round:summary`), Modus `starchase` mit Pause von 8 s,
   Ziehung, Auswertung, Deckel und Wiederherstellung bei Reconnect und Late Join. **Erledigt.**
5. Missionsanzeige (`MissionPanel.vue`, mit Status führt / gleichauf / hinten und offen / geschafft / verpasst), Stern in
   der Spielerliste für den, der gerade eine Mission halten würde, Zusammenfassung zwischen den Runden
   (`RoundSummary.vue`), Moduswahl in den Raumparametern und Regelkarte. „Comeback" wird in der ersten Runde nicht gezogen.
   **Erledigt.**
6. Stern-Item mit Ring-Timer (`BonusStar` als spezieller Eintrag des Bonus-Registers: kein Raumwahl-Bonus, kleinerer Radius pro
   Typ, `StarSpawner`, Lebensdauer im `bonus:pop`). **Erledigt.**
7. Erweiterungen aus Abschnitt 7.

## 9. Risiken

- **Farming**: Near Misses lassen sich absichtlich provozieren. Gegenmittel: Deckel pro Mission und Runde, nur der Beste
  bekommt den Stern, bei Unverwundbarkeit zählt nichts.
- **Lesbarkeit**: Zu viele Punktequellen verwässern das Gefühl „wer war besser". Darum nur 2 Missionen, klare
  Aufschlüsselung im Overlay und eine ruhige Anzeige am Rand.
- **Spielerzahl**: Mit 2 Spielern sind Missionen schwach, darum dort nur 1 Mission und ein kleinerer Pool.
- **Kalibrierung**: Lebensdauer und Anzahl der Sterne, die Faktoren der Punktwerte (½ und ⅓) sowie die Standardwerte der
  Siegbedingungen werden mit echten Runden und den erfassten Rundenzeiten nachjustiert.
- **Große Runden**: Bei 20 Spielern ist die Karte groß, und viele Sterne und Missionen konkurrieren. Darum die höheren
  Deckel (5 Sterne, 3 Missionen) ab 10 Spielern.
