# Danube Navigator – Phase 3.1

Eigenständige PWA zur Donau-Fahrradtour, basierend auf der Phase-2-Anwendung. Die ursprüngliche PoB-App wird nicht verändert.

## Funktionen

- GPX-Referenzroute (Komoot, ca. 2644 km)
- GPS, Abweichung und Fortschrittsanzeige
- Tour starten/pausieren und gefahrene Distanz lokal speichern (nur bei geöffneter App)
- MapLibre-Karte mit OSM-Rasterkarten **online** als Fallback
- PMTiles-Vektorkartenpaket **offline** aus dem OPFS des Browsers
- Offline-Kartenpaket herunterladen oder lokal importieren
- Separat automatisch erstellbare OSM-Testkarte Donaueschingen–Tuttlingen

## Vorbereitung der Testkarte (einmalig)

1. ZIP-Inhalt ins **Root-Verzeichnis** des GitHub-Repositories hochladen, mit gleicher Ordnerstruktur.
2. GitHub → **Actions** → **Offline-Testkarte erstellen** → **Run workflow**.
3. Erfolgreichen Lauf abwarten. Er erzeugt `data/maps/donau-test.pmtiles` und committet die Datei.
4. GitHub Pages neu öffnen und **Testkarte herunterladen** antippen.
5. Auf **Offline bereit** warten und dann den Flugmodus einschalten und die Seite neu laden.

Falls die GitHub Action mit `403` bei `git push` scheitert, müssen unter **Settings → Actions → General → Workflow permissions** Schreibrechte für Actions erlaubt sein.

Die Workflow-Karte verwendet Protomaps-Demodaten. Der Ausschnitt wird über das freie PMTiles-Werkzeug `go-pmtiles` auf GitHub erstellt. Der Workflow selbst ist ein erster Prototyp und noch nicht auf GitHub erfolgreich durchgelaufen.

## Besonderheiten

- **Keine OSM-Rasterkacheln massenhaft herunterladen.** Die OSM-Online-Karte dient nur als Online-Fallback.
- **PMTiles ist nicht dasselbe wie Routing.** Das Offline-Routing folgt in einer späteren Phase.
- Die Offline-Testkarte ist nur ein kleiner Ausschnitt (ca. 8.43–8.91°E, 47.89–48.15°N) und nur bis Zoom 14 detailreich (in größerem Zoom überzeichnet).
- Offline sind Straßen, Wasser, Flächen und Gebäude sichtbar. **Ortsnamen sind in dieser Testversion noch nicht enthalten**, da dafür zusätzlich lokal gespeicherte Schrift-/Glyph-Dateien benötigt werden.
- **OPFS wird beim Löschen der Websitedaten ebenfalls gelöscht.** Nicht auf "Website-Daten schreddern" klicken, wenn Kartendaten erhalten bleiben sollen. Die App-Shell wird per Service Worker aktualisiert, Tourfortschritt bleibt dabei bestehen.
- Auf Android verhindert der gesperrte Bildschirm eine zuverlässige GPS-Aufzeichnung in der PWA. Für dauerhaftes Tracking benötigen wir später einen nativen Android-Hintergrunddienst.
- Abseits des Testgebiets bleibt die Offline-Karte leer. Die GPX-Route selbst ist weltweit verfügbar.

## Datenschutz/Lizenzen

Kartengrundlage: © OpenStreetMap contributors (ODbL), über den Protomaps-v4-Basemap-Datensatz. MapLibre GL JS und PMTiles BSD-3-Clause-Lizenz.

## Technischer Stand

Dies ist ein **Prototyp**. Die Online-Bibliotheken werden bei der ersten erfolgreichen Online-Nutzung im PWA-Cache hinterlegt. Der Download von Kartenpaketen schreibt sequentiell nach OPFS. Wenn der Speicherplatz knapp wird, kann der Download fehlschlagen.
