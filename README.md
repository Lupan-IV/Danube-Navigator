# Donau Offlinekarte (Minimalversion)

Eine kleine Offline-Web-App für **Karte + Points of Interest + GPS-Standortmarker**. Keine Navigation, Touraufzeichnung, Etappen, Wetter oder Fortschrittsberechnung.

## Stand

- **Funktionierender Prototyp für Ulm/Neu-Ulm**: Kartenpaket wird in der GitHub-Action erstellt (nicht in diesem ZIP enthalten).
- **Offlinekarte**: MapLibre, PMTiles und Speicherung im Browser-Dateisystem (OPFS).
- **POIs**: OpenStreetMap-Orte werden aus Geofabrik-Rohdaten extrahiert und als GeoJSON im Repository gespeichert.
- **GPS**: Der aktuelle Standort wird als blauer Punkt dargestellt, solange die App geöffnet ist. **Kein Tracking**, kein Speichern von Positionen.
- **Donauroute ±50 km**: Das Polygon unter `data/route/corridor-50km.geojson` ist aus der aktuellen GPX erzeugt. **Es enthält keine Kartendaten.** Die eigentlichen Kartenpakete für die vollständige Tour sind noch nicht erstellt.

## Einrichtung auf GitHub

1. Alle Dateien **mit ihrer Ordnerstruktur** in das öffentliche Repository hochladen.
2. Unter **Actions → Offline-Testkarte erstellen** den Workflow starten (erstellt das Ulmer Paket und lädt die Schriften herunter).
3. Unter **Actions → OSM-POIs importieren** den zweiten Workflow starten.
4. GitHub Pages unter Settings → Pages für `main / (root)` aktivieren.
5. Die App auf dem Handy **online** laden. Unter **Karte & POIs** die **Ulm-Testkarte laden**.
6. App erneut öffnen, Flugmodus einschalten und Ulm ansehen. GPS lässt sich bei Bedarf einschalten.

**Wichtig:** Der zweite GitHub-Workflow kann auch später laufen; dann zeigt die App bis dahin keine POIs an. Ein neuer Commit der Workflows erzeugt keine Daten automatisch. Beide Workflows müssen manuell gestartet werden. Bei einem Neuaufsetzen des Repositories die Action erneut ausführen.

## Technische Hinweise

- Bei Internetverbindung wird ohne lokales PMTiles-Paket vorübergehend die normale OSM-Rasterkarte angezeigt. **Diese Online-Karte ist nicht offline verfügbar.**
- Beim ersten Online-Aufruf den Service Worker installieren lassen. Die externen JS-Bibliotheken und die für offline benötigten Schriftdateien müssen zuvor erfolgreich geladen worden sein.
- Die gespeicherte Testkarte bleibt in OPFS, bis Browser/Website-Daten gelöscht werden. Das Speichersystem kann unter Gerätespeicherdruck ebenfalls geräumt werden.
- Nur eine `.pmtiles`-Datei ist gleichzeitig aktiv. Das ist bewusst minimal. Für die ganze Route sind regionale Pakete und eine Auswahlmechanik nötig.
- **Kein vollwertiges Offline-Routing.** Ein GPS-Fix funktioniert grundsätzlich auch ohne Internet, wenn Standortberechtigungen aktiv sind. Im gesperrten Bildschirm läuft die Browser-App nicht zuverlässig weiter.
- OSM-Daten © OpenStreetMap contributors, ODbL. Beachte die Lizenz für die Verwendung/Weitergabe der Daten.

## Korridor erzeugen

Die GPX-Datei ist ausschließlich **Build-Eingabe**, die App lädt sie nicht. Der Korridor wird mit dem Skript `tools/create_corridor.py` erstellt (Python-Pakete: `shapely` und `pyproj`).

```bash
python tools/create_corridor.py --input data/route/reference-route.gpx --output data/route/corridor-50km.geojson --radius-km 50
```

Das Ergebnis ist eine GeoJSON-Fläche, **keine Offlinekarte**. Für den vollständigen Korridor brauchen wir eigene, möglichst kleine PMTiles-Kartenpakete und entsprechende OSM-POIs. Bei der Größe ist GitHub Pages als Ablage für alle Kartenpakete voraussichtlich ungeeignet (Site-Limit 1 GB; Dateien >100 MB benötigen andere Bereitstellung). Hierfür ist ein separater Downloadserver oder eine native Offlinekarten-App möglicherweise sinnvoller.

## Dateien

- `index.html`, `assets/css/app.css`, `assets/js/app.js`: Oberfläche und GPS
- `assets/js/offline-maps.js`, `assets/js/map-style.js`: Offlinekarte
- `assets/js/outdoor-pois.js`: POIs und Filter
- `.github/workflows/create-test-map.yml`: Ulm-Z16-Kartenpaket
- `.github/workflows/import-outdoor-pois.yml`: OSM-POI-Export
- `tools/create_corridor.py`: GPX → ±50-km-Korridor
- `data/route/reference-route.gpx`: aktuelle Routenreferenz (Vama Veche → Constanța)

## Status

Die Minimalversion wurde auf Dateipfade, Syntax und lokale Beispieldaten geprüft. Die GitHub-Actions und der tatsächliche Flugmodus-Test auf dem Handy sind noch nicht mit **dieser** Version durchgeführt worden.
