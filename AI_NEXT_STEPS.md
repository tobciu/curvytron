__Nächste Schritte (TODOs):__

1. __Server-Implementierung:__ Die gesamte Spiellogik auf dem Client ist jetzt implementiert, aber es fehlt die serverseitige Gegenstelle. Der Server muss die folgenden Ereignisse verarbeiten:

   - `room:create`: Einen neuen Raum erstellen.
   - `room:join`: Einem Raum beitreten.
   - `room:leave`: Einen Raum verlassen.
   - `player:move`: Die Spielerbewegungen empfangen und an die anderen Spieler im Raum weiterleiten.

2. __Fehlerbehebung bei der Navigation:__ Die Navigation zwischen den Seiten funktioniert nicht wie erwartet. Dies scheint ein Problem mit dem CSS-Layout zu sein, das die Links überlagert und sie unklickbar macht.

3. __Unit-Tests fertigstellen:__ Die grundlegende Test-Infrastruktur wurde eingerichtet, aber es müssen noch Tests für die gesamte Spiellogik und die Komponenten geschrieben werden.

__Aktuelle Probleme:__

1. __Spiel startet nicht:__ Das Spiel startet nicht, da der Server das `game:start`-Ereignis nicht sendet.
2. __Keine Räume verfügbar:__ Die Raumliste ist leer, da der Server keine Daten sendet.
3. __Raum-Erstellung funktioniert nicht:__ Das Erstellen eines Raums schlägt fehl, da der Server das `room:create`-Ereignis nicht verarbeitet.

Sobald die serverseitige Logik implementiert ist, sollten diese Probleme behoben sein.
