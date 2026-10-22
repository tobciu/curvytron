# Sternenjagd – Game Design Document

Status: Entwurf, nichts ist umgesetzt.

## 1. Überblick

Die **Sternenjagd** ist ein alternativer Spielmodus für Curvytron. Er ändert die Wertung, nicht die Steuerung und nicht
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
| Modus (Wertung) | Klassisch, Sternenjagd | Klassisch |
| Siegbedingung | Punktelimit oder feste Rundenzahl | Sternenjagd: 8 Runden; Klassisch: Punktelimit wie bisher |

Modus und Siegbedingung sind unabhängig: Beide Siegbedingungen sind in beiden Modi wählbar.

## 2. Spielablauf einer Runde

1. **Start**: Zwei Missionen werden gezogen und allen gezeigt (Spieler, Tote und Zuschauer). Die normale Aufwärmphase
   (`warmupTime`, 3 s) läuft wie bisher.
2. **Runde**: Alle fahren. Während der Runde stehen die Missionen mit Live-Stand am Rand, Sterne erscheinen auf dem
   Spielfeld. Punkte für Platzierung gibt es wie im klassischen Modus.
3. **Ende**: Sobald nur noch einer lebt, endet die Runde. Die Missionen werden ausgewertet, die Sterne vergeben.
4. **Zwischenstand**: Ein Overlay zeigt die Aufschlüsselung der Punkte jedes Spielers (Platzierung, Missionen, gesammelte
   Sterne) und den Gesamtstand. Die Pause (`warmdownTime`) beträgt in der Sternenjagd **8 s**.
5. **Nächste Runde** oder Spielende nach der Siegbedingung.

## 3. Punktequellen

| Quelle | Punkte |
|---|---|
| Platzierung in der Runde | wie im klassischen Modus (Reihenfolge der Tode, Rundensieger n-1) |
| Mission gewonnen | 3 pro Mission |
| Stern aufgesammelt | 2 pro Stern |

In den letzten 2 Runden einer Partie mit fester Rundenzahl (**Finale**) zählt jede Quelle doppelt.

## 4. Rundenmissionen

### 4.1 Regeln

- Zu jeder Runde werden 2 verschiedene Missionen aus dem Pool gezogen. Sie sind vor der Runde bekannt und ändern das
  Verhalten: Man fährt nah an Trails oder jagt Bonis, obwohl man sonst sicher fahren würde.
- Es gewinnt der Spieler mit dem besten Wert der Mission. Bei Gleichstand bekommen alle Gleichplatzierten den Stern. Bei
  Wert 0 bekommt niemand einen.
- Alle Missionen sind gleich viel wert, die Schwierigkeit gleicht sich selbst aus, weil man sich nur mit den anderen
  Spielern vergleicht.
- Jede Mission zählt pro Runde für einen Spieler nur einmal. Dieselbe Mission kann in späteren Runden wieder gezogen
  werden, aber nicht in der direkt folgenden.
- Die Ziehung richtet sich nach der Spielerzahl: Missionen, die mit wenigen Spielern sinnlos sind (zum Beispiel
  Nadelöhr), werden dann nicht gezogen. Bei 2 Spielern wird nur 1 Mission gezogen.
- Nichts zählt, solange ein Avatar unverwundbar ist (wie bei den Statistiken). Pro Mission und Runde gibt es einen
  Deckel für den Zähler, damit sich Werte nicht absichtlich hochtreiben lassen.

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
| Hartnäckig | mit mindestens 2 Mali von Gegnern überlebt |

### 4.3 Anzeige während der Runde

Die Missionen stehen die ganze Runde über klein am Rand des Spielfelds, auch für Tote und Zuschauer. Sie lenken nicht vom
Spielfeld ab: Nur der Stand ändert sich.

- Je Mission: Name, kurze Beschreibung, der eigene Wert und der Wert des Führenden, zum Beispiel „du: 3 · Anna führt mit 5".
- Status je Mission: **führt** (der Stern wäre jetzt deiner), **gleichauf** oder **hinten** (mit Abstand zum Führenden).
  Es wird bewusst nie angezeigt, dass jemand „keine Chance mehr" hat: Das würde nur demotivieren.
- Ja/Nein-Missionen (Kamikaze, Comeback, Hartnäckig) zeigen „offen", „geschafft" oder „verpasst".
- Wer gerade einen Stern halten würde, trägt einen kleinen Stern neben dem Namen in der Spielerliste.
- Am Rundenende zeigt das Overlay das Ergebnis jeder Mission und wer den Stern bekommen hat.

## 5. Stern-Item

Der Stern ist ein eigener Bonus-Typ ohne Effekt (er wird über das Bonus-Registry angelegt, siehe `doc/bonuses.md`). Wer
ihn einsammelt, bekommt sofort 2 Punkte.

- **Größe**: kleiner als die normalen Bonis, man muss genauer treffen. Die Größe ist daher pro Bonus-Typ einstellbar
  (`BaseBonus.radius` ist heute für alle gleich).
- **Anzahl**: selten und begrenzt, abhängig von der Spielerzahl: `aufgerundet(Spieler / 2)`, höchstens 3 pro Runde (2
  Spieler: 1, 3–4 Spieler: 2). Die Sterne erscheinen zeitlich verteilt, nicht alle auf einmal.
- **Platzierung**: bewusst an riskanten Orten, nah an der Wand oder an Trails, nicht gleichverteilt wie die normalen Bonis
  (eigene Platzierung neben `BonusManager.getRandomPosition`).
- **Lebensdauer**: Der Stern verschwindet nach einer Zeit wieder. Sie beträgt mindestens 10 s und wächst mit der
  Kartengröße: `10 s · Kartengröße / Kartengröße für 2 Spieler` (bei 2 Spielern 10 s, bei 4 etwa 11,5 s, bei 8 etwa
  14 s).
- **Anzeige**: Ein Ring um den Stern zeigt die Restzeit und wird immer kleiner (Fortschrittsanzeige als Ring).

## 6. Siegbedingung

- **Feste Rundenzahl** (Standard 8): Die Dauer ist planbar, und die Spannung bleibt bis zum Schluss, weil Sterne alles
  drehen können. Es gilt das Finale (doppelte Punkte in den letzten 2 Runden). Bei Gleichstand nach der letzten Runde
  folgt eine Stichrunde unter den Gleichplatzierten.
- **Punktelimit**: wie heute (`maxScore`). Kein Finale.

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
- **Statistiken**: `GameStats` zählt über das ganze Spiel, pro Runde gibt es nur Sieger und Dauer (`rounds[]`).
  Near Misses und Squeezes gibt es bereits (`testSurroundings`).
- **Anzeige**: `PlayerList.vue` zeigt `+roundScore` und `score`.
- **Pausen**: `warmupTime = 3000`, `warmdownTime = 5000` in `BaseGame`.

### 8.2 Bausteine

1. **Statistiken pro Runde**: `GameStats` bekommt je Spieler ein `round`-Objekt neben den Gesamtzählern, das in
   `onRoundStart` zurückgesetzt wird (der offene Punkt „Werte pro Runde" in `doc/todo.md`). Neue Zähler: Zeit nah an der
   Wand, Platz in der Runde, überlebte Mali, Reihenfolge der Tode.
2. **Wertung als Strategie**: Ein Interface `ScoringMode` (`classic`, `party`) mit den Hooks `onKill`, `onBonusCatch` und
   `onRoundEnd`. `Game.resolveScores` und `isWon` geben dorthin ab, die Siegbedingung ist davon getrennt. Der klassische
   Modus bleibt unverändert.
3. **Missions-Modul**: Pool, Ziehung abhängig von der Spielerzahl, laufender Stand (Werte aller Spieler, Führender und
   Status je Spieler) und Auswertung am Rundenende.
4. **Raum-Einstellung**: Modus (`classic` / `party`) und Siegbedingung (Punkte oder Runden, mit Wert) in `BaseRoomConfig`
   und in den Raumparametern. Die Pause von 8 s wird im Modus gesetzt, nicht global.
5. **Stern-Bonus**: eigener Radius pro Typ, eigene Platzierung, Begrenzung nach Spielerzahl, Lebensdauer mit
   Entfernen durch den Server (`bonus:clear` gibt es bereits).
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
- Finale (doppelte Punkte) und Stichrunde bei fester Rundenzahl.
- Der klassische Modus liefert dieselben Punkte wie vorher.
- Ein e2e-Lauf der Sternenjagd.

### 8.4 Reihenfolge

1. Statistiken pro Runde (auch ohne den neuen Modus nützlich).
2. Interface `ScoringMode`, der klassische Modus dahinter, unverändert und getestet.
3. Missionen mit Protokoll und Raum-Einstellung.
4. Missionsanzeige und Overlay zwischen den Runden.
5. Stern-Item mit Ring-Timer.
6. Erweiterungen aus Abschnitt 7.

## 9. Risiken

- **Farming**: Near Misses lassen sich absichtlich provozieren. Gegenmittel: Deckel pro Mission und Runde, nur der Beste
  bekommt den Stern, bei Unverwundbarkeit zählt nichts.
- **Lesbarkeit**: Zu viele Punktequellen verwässern das Gefühl „wer war besser". Darum nur 2 Missionen, klare
  Aufschlüsselung im Overlay und eine ruhige Anzeige am Rand.
- **Spielerzahl**: Mit 2 Spielern sind Missionen schwach, darum dort nur 1 Mission und ein kleinerer Pool.
- **Kalibrierung**: Lebensdauer und Anzahl der Sterne werden beim Testen mit echten Runden nachjustiert.
