# Sternenjagd (Party-Modus, Entwurf)

Stand: Idee und Plan, nichts ist umgesetzt. Der Arbeitsname ist „Sternenjagd" (Alternativen: „Sterne", „Turnier"),
im Text steht „Party-Modus" für denselben Modus. Die offenen Fragen stehen am Ende.

## Idee

Eine alternative Art, ein Spiel zu werten, ähnlich den Sternen bei Mario Party: Gut fahren bleibt die Grundlage, reicht
aber nicht mehr aus. Man muss sich auch um andere Dinge kümmern: Bonis einsammeln, auch wenn man nicht will, riskanter
fahren, den Führenden jagen.

Es gibt **nur eine Punktzahl** (keine zweite Währung). So bleiben `PlayerList`, die Rangliste und das Spielende
unverändert. Die Sterne sind nur eine besondere Punktequelle mit hohem Wert.

## Ausgangslage

- **Punkte heute**: Jeder Tod gibt Punkte nach Reihenfolge (`Game.kill`, Anzahl der bereits toten Avatare), der
  Rundensieger bekommt zusätzlich n-1 (`resolveScores`). Wer zuerst `maxScore` erreicht, gewinnt das Spiel (`isWon`).
- **Bonis**: `BonusManager.testCatch` löst `bonus:catch` aus, `GameStats` hört schon darauf.
- **Statistiken**: `GameStats` zählt über das ganze Spiel. Pro Runde gibt es nur Sieger und Dauer (`rounds[]`). Die Werte
  pro Runde stehen schon in `doc/todo.md` und sind der erste Schritt für diesen Modus.
- **Fahrstil-Messwerte**: Near Misses und Squeezes gibt es (`testSurroundings`), bei Unverwundbarkeit zählt nichts.
- **Pause zwischen den Runden**: `warmdownTime = 5000`, `warmupTime = 3000` (`BaseGame`). Die Auszeichnungen werden nur am
  Spielende gezeigt, weil 5 s zum Lesen zu kurz sind.
- **Anzeige**: `PlayerList.vue` zeigt `+roundScore` und `score`.

## Punktequellen im Party-Modus

### 1. Rundenmissionen („Bonus-Sterne" nach der Runde)

- Zu Rundenbeginn werden 2 Missionen aus einem Pool gezogen und allen angezeigt.
- Nach der Runde bekommt der Beste jeder Mission einen Stern, 3 Punkte wert, bei allen Missionen gleich. Die Schwierigkeit
  gleicht sich selbst aus, weil man sich nur mit den anderen vergleicht.
- Pro Runde zählt jede Mission für einen Spieler nur einmal. Dieselbe Mission darf in späteren Runden wieder gezogen
  werden, aber nicht direkt in der Folgerunde.
- Die Missionen werden **vorher angesagt** (Mario Party deckt sie erst am Ende auf). Das ändert das Verhalten: Man fährt
  nah an Trails oder jagt Bonis, obwohl man sonst sicher fahren würde.
- Gleichstand: Alle Gleichplatzierten bekommen den Stern. Bei Wert 0 bekommt niemand einen.

**Später**: „Ziel-Missionen" („schaffe mindestens …"). Jeder, der die Schwelle erreicht, bekommt Punkte, gestaffelt in
Bronze / Silber / Gold (1 / 2 / 3 Punkte): leichte Ziele geben weniger, schwere mehr. Das braucht feste Schwellen, die wir
erst nach Spieldaten sinnvoll setzen können. Die erste Version hat nur die Wettbewerbs-Missionen unten.

Pool (Wettbewerb):

| Mission | Messwert |
|---|---|
| Nahkampf | meiste Near Misses |
| Nadelöhr | meiste Squeezes |
| Sammler | meiste Bonis eingesammelt |
| Jäger | meiste Kills auf den eigenen Trail |
| Wandläufer | längste Zeit nah an der Wand, ohne zu sterben |
| Marathon | längste Strecke |
| Kamikaze | als Erster gestorben, aber dabei jemanden mitgenommen |
| Comeback | gewinnt eine Runde nach letztem Platz in der Runde davor |
| Hartnäckig | überlebt mit mindestens 2 Mali von Gegnern |

### 2. Stern als Item im Spielfeld

- Neuer Bonus-Typ „Stern" (über das Bonus-Registry, siehe `doc/bonuses.md`), ohne Effekt, +2 Punkte beim Einsammeln.
- **Kleiner** als die normalen Bonis, man muss genauer treffen. Dafür muss die Größe pro Bonus-Typ einstellbar werden
  (`BaseBonus.radius` ist heute statisch für alle gleich).
- **Selten und begrenzt**, abhängig von der Spielerzahl: zum Beispiel `aufgerundet(Spieler / 2)`, höchstens 3 pro
  Runde (2 Spieler: 1, 3–4 Spieler: 2). Die Sterne erscheinen zeitlich verteilt, nicht alle auf einmal.
- **Platzierung** bewusst an riskanten Orten (nah an Wand oder Trails) statt gleichverteilt wie die normalen Bonis. Dafür
  braucht es eine eigene Platzierung neben `BonusManager.getRandomPosition`.
- **Verschwindet nach einer Zeit** wieder (mehr Druck). Der Client zeigt die Restzeit als **Ring um den Stern**, der
  immer kleiner wird (Fortschrittsanzeige als Ring). Der Server schickt beim Erscheinen die Lebensdauer mit und entfernt
  den Stern selbst (`bonus:clear` gibt es schon). Bei Reconnect wird die Restzeit mitgeschickt, damit der Ring stimmt.

### 3. Wie das Spiel gewonnen wird

Der Spielleiter legt vor dem Spiel zwei Dinge fest, **unabhängig voneinander**:

- **Modus (Wertung)**: Klassisch oder Sternenjagd.
- **Siegbedingung**: Punktelimit (wie heute `maxScore`) oder feste Rundenzahl (zum Beispiel 8). Beides ist in beiden
  Modi wählbar.

Bei fester Rundenzahl ist die Dauer planbar, und die Spannung bleibt bis zum Schluss, weil Sterne alles drehen können.
Nur dabei gilt das **Finale**: In den letzten 2 Runden zählt alles doppelt. Bei Gleichstand nach der letzten Runde gibt
es eine Stichrunde unter den Gleichplatzierten.

## Weitere Ideen, nach Aufwand sortiert

| Idee | Wirkung | Aufwand |
|---|---|---|
| Overlay zwischen den Runden mit Aufschlüsselung der Punkte (Platz, Missionen, Stern) und längere Pause (8–10 s), nur in diesem Modus | Sichtbarkeit, Dramatik | gering |
| Hilfe für die Letzten: bessere Bonus-Chancen über `getProbability` | kein Frust, enge Rennen | gering |
| Der Führende trägt die Krone (der goldene Rand existiert schon) | alle jagen den Führenden | vorhanden |
| Dieb-Bonus: nimmt dem Führenden 1 Punkt | Dramatik | mittel |
| Chaos-Runde (alle paar Sekunden ein zufälliger Bonus-Effekt) | Abwechslung | mittel |
| Versteckte Mission (nur für einen Spieler sichtbar) | Mario-Party-Gefühl | höher |
| Wetten: vor der Runde 1 Punkt auf den Sieger setzen | auch Tote bleiben beteiligt | höher |

Vorschlag für den Start: Missionen, Stern-Item und Overlay.

## Umsetzung (grob)

1. **Statistiken pro Runde**: `GameStats` bekommt je Spieler ein `round`-Objekt neben den Gesamtzählern, das in
   `onRoundStart` zurückgesetzt wird (der offene Punkt aus `doc/todo.md`). Neue Zähler: Zeit nah an der Wand, Platz in
   der Runde, überlebte Mali, Reihenfolge der Tode.
2. **Wertung als Strategie**: Ein Interface `ScoringMode` (`classic`, `party`) mit den Hooks `onKill`, `onBonusCatch` und
   `onRoundEnd`. `Game.resolveScores` und `isWon` geben dorthin ab. Der klassische Modus bleibt unverändert.
3. **Missions-Modul**: Pool, Ziehung abhängig von der Spielerzahl (Squeezes sind mit 2 Spielern sinnlos) und
   Auswertung am Rundenende.
4. **Raum-Einstellung**: Modus (`classic` / `party`) und Siegbedingung (Punkte oder Runden, mit Wert) in
   `BaseRoomConfig` und in den Raumparametern. Wertung und Siegbedingung sind getrennte Teile von `Game`.
5. **Protokoll** (`src/shared/protocol.ts`): `round:missions` (Start) und `round:summary` (Ende, mit Aufschlüsselung
   pro Spieler). Reconnect und Late Join müssen den Zustand mitführen: Wer mitten in der Runde zurückkommt, sieht die
   aktuellen Missionen, und `present` / `away` bleiben bei der Auswertung richtig.
6. **Client**: Anzeige der Missionen im Spiel, Overlay zwischen den Runden, Sprite für den Stern (`npm run sprite`),
   Ring-Timer um den Stern.
7. **Tests**: Missionen mit Gleichstand, Spieler, die gehen oder kommen, Reconnect mitten in der Runde, ein e2e-Lauf
   des Modus.

## Risiken

- **Farming**: Near Misses lassen sich absichtlich provozieren. Gegenmittel: Deckel pro Runde, nur der Beste bekommt den
  Stern, bei Unverwundbarkeit zählt nichts (ist schon so).
- **Lesbarkeit**: Zu viele Quellen verwässern das Gefühl „wer war besser". Deshalb nur 2 Missionen und eine klare
  Aufschlüsselung.
- **Spielerzahl**: Mit 2 Spielern sind Missionen schwach. Dann ein kleinerer Pool oder nur 1 Mission.

## Entschieden

- Missionen sind angesagt, bei der ersten Version nur Wettbewerb mit gleichem Wert; Ziel-Missionen später.
- Stern-Item kommt, klein, begrenzt nach Spielerzahl, mit Ring-Timer.
- Siegbedingung (Punkte oder Runden) ist eine Raum-Einstellung, getrennt vom Modus.

## Offene Fragen

1. **Name** des Modus: „Sternenjagd" oder etwas anderes?
2. **Pause**: 8–10 s nur im neuen Modus oder eine längere Pause für alle Modi?
3. **Lebensdauer des Sterns**: Wie lang (Vorschlag 10–15 s)? Soll sie mit der Kartengröße wachsen?
4. **Standardwerte**: Rundenzahl 8, Punktelimit wie bisher?

## Vorgeschlagene Reihenfolge

1. Statistiken pro Runde (auch ohne den neuen Modus nützlich).
2. Interface `ScoringMode`, der klassische Modus dahinter, unverändert und getestet.
3. Missionen + Raum-Einstellung + Protokoll.
4. Overlay zwischen den Runden.
5. Stern-Item.
6. Weitere Ideen aus der Tabelle.
