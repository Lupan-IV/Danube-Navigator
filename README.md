# Danube Navigator – sauberer Projektstand (Phase 3.1)

Eigenständige PWA für die Donauradtour. Das alte Peaks-of-the-Balkans-Projekt bleibt unverändert.

## Enthalten

- Komoot-Referenzroute: `data/reference-route.gpx` (ca. 2648.5 km)
- GPS-Standort, Entfernung zur Route, Restdistanz
- Manuelle Tour starten/pausieren, lokal gespeicherte Distanz (bei geöffneter App)
- MapLibre GL JS 5.24.0 und PMTiles 4.5.0 (kompatible Browser-Einbindung)
- Online-OSM-Karte als Fallback; regionale Offline-Testkarte in OPFS herunterladen oder importieren
- Funktionsfähiger GitHub-Actions-Workflow zur Erzeugung von `data/maps/donau-test.pmtiles`
- Service-Worker-Cache für PWA-Appdateien

## Sauberer GitHub-Upload

ZIP **vollständig entpacken**. Den Inhalt von `Danube-Navigator-CLEAN` ins **Root** des Repositories hochladen. Ordnerstruktur unbedingt beibehalten. `index.html` muss direkt im Root sein, die JavaScript-Dateien in `assets/js/` und die GPX-Datei in `data/`.

Die ZIP enthält **noch nicht** die erzeugte PMTiles-Kartendatei. Die Action erstellt sie nach dem Upload automatisch und committet sie ins Repository.

1. GitHub → Actions → **Offline-Testkarte erstellen** → **Run workflow**.
2. Nach grünem Ergebnis prüfen, dass `data/maps/donau-test.pmtiles` vorhanden ist.
3. GitHub Pages öffnen; ggf. warten, bis die neue Version veröffentlicht ist.
4. **Testkarte herunterladen** antippen und bis **Offline bereit** warten.
5. App schließen, Flugmodus einschalten, App erneut öffnen und in der Testregion zoomen.

**Wichtig:** Für den allerersten Aufruf Internet bereitstellen, damit MapLibre und PMTiles geladen und durch den Service Worker zwischengespeichert werden können. Die beiden Bibliotheken stammen aus jsDelivr und sind nicht im ZIP enthalten.

## Umfang und Grenzen

- Testregion: Donaueschingen–Tuttlingen (bbox 8.43,47.89,8.91,48.15; max. native Zoomstufe 14)
- Offline-Beschriftungen für Orte, Straßennamen und Fließgewässer wurden ergänzt. Der GitHub-Workflow lädt dazu Schriftdateien in `assets/fonts/` (diese sind im ZIP noch nicht vorhanden). Dieser Schritt ist noch nicht auf GitHub getestet.
- Freies Offline-Routing, große ±50-km-Korridorkarten und POIs folgen in späteren Phasen.
- GPS-Aufzeichnung stoppt bei ausgeschaltetem Bildschirm möglicherweise: Android-PWA-Einschränkung.
- Website-Daten **nicht schreddern**: Dadurch gehen OPFS-Kartenpakete und gespeicherter Tourfortschritt verloren.
- Der Workflow braucht GitHub-Actions-Schreibrechte, weil er die Kartendatei committen soll.
- `data/maps/.gitkeep` hält das Verzeichnis in Git, bis die Kartendatei erzeugt wurde.

## Lizenz / Kartenquelle

Kartendaten © OpenStreetMap contributors (ODbL), aus Protomaps. Die Kartenansicht benutzt MapLibre und PMTiles (BSD-Lizenzen). Keine massenhaften Downloads von OSM-Rasterkacheln durchführen.

## Aktualisierte Referenzroute (13.11.2026)

- Komoot-GPX mit 35.299 Trackpunkten, ca. 2648,5 km.
- Die neue Route endet im Bereich Constanța (44.190461, 28.622170), nicht in Vama Veche.
- Für Vama Veche ist noch eine Erweiterung der Strecke notwendig.
- Cache-Version für die geänderte GPX erhöht; keine Löschung von Website-Daten erforderlich.

## Kartenausschnitt / Beschriftungen

- Die **aktuelle Testkarte** ist ein kleiner rechteckiger Ausschnitt (8.43–8.91° E, 47.89–48.15° N) und nicht der endgültige GPX-Korridor.
- Für die **gesamte Tour** ist ein ±50-km-Korridor entlang der späteren GPX vorgesehen. Der entsprechende Workflow ist noch nicht implementiert. Insbesondere nahe Donaueschingen können damit Bereiche am Bodensee innerhalb des Korridors liegen.
- Die Testkarte soll Offline-Schriften lokal unter `assets/fonts/` bekommen. Bitte die GitHub-Action nach diesem Update erneut starten und prüfen, ob die Schriftdatei `assets/fonts/Noto Sans Regular/0-255.pbf` entstanden ist.
- `PMTiles importieren` wählt eine bereits auf dem Gerät vorhandene PMTiles-Datei aus. Für die normale Nutzung reicht `Testkarte herunterladen`.
