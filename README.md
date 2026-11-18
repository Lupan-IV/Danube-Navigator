# Danube Navigator – Ulm/Neu-Ulm Zoom-16-Pilot (18.11.2026)

Komplettes GitHub-Pages-PWA-Projekt, basierend auf der vorhandenen Donau-Version. Das PoB-Projekt bleibt unberührt.

## Was ist neu?

- Offline-Karten-Testgebiet: **Ulm / Neu-Ulm**, `9.82,48.27,10.16,48.53` (ca. 25 × 29 km).
- Die GitHub-Action erzeugt eine eigene **Z16-PMTiles-Vektorkarte aus OSM-Rohdaten**, statt vorhandene Protomaps-Karten bis Z15 auszuschneiden.
- Quellen: Geofabrik `tuebingen-regbez` (Baden-Württemberg) und `schwaben` (Bayern).
- Werkzeuge: Osmium + tilemaker. Ein kleines angepasstes Kachel-Schema passt zu unserem Kartenstil (`roads`, `buildings`, `places`, `water`, `landuse`).
- Outdoor-POI-Action arbeitet ebenfalls im Ulm-Kartenausschnitt.
- App öffnet Ulm als Testgebiet, aber die gesamte Komoot-Referenz-GPX bleibt erhalten.
- Neues Offline-Dateikennzeichen `danube-ulm-z16.pmtiles`, damit alte Testkarten nicht fälschlich angezeigt werden.

## Installation

1. ZIP vollständig entpacken und **alle Dateien/Ordner mit korrekter Struktur** in das GitHub-Repository laden.
2. GitHub → **Actions** → **Offline-Testkarte erstellen** → **Run workflow**.
3. Prüfen, ob `data/maps/ulm-test-z16.pmtiles` nach einem **grünen** Lauf im Repository liegt. Dieser neue Workflow ist **noch nicht live ausgeführt** worden.
4. Wenn er erfolgreich war: **Actions → Outdoor-POIs importieren → Run workflow**. Die POIs liegen anschließend in `data/pois/outdoor-test.geojson`.
5. Nach der Veröffentlichung durch GitHub Pages die App online öffnen, **Testkarte herunterladen** antippen.
6. Nach „Offline bereit … Z16“ Flugmodus einschalten und die App erneut öffnen. Auf der Karte sollten Straßen, Wege, Gebäude, Ortsnamen und Outdoor-POIs in Ulm/Neu-Ulm erkennbar sein.

## Technische Hinweise

- Der Kartenbau ist ein **Experiment**. Die JSON-/JS-/Python-Dateien sind statisch geprüft, aber die externe GitHub-Action mit tilemaker muss erst auf GitHub erfolgreich laufen. Fehler bitte anhand des `build-map`-Protokolls melden.
- Die OSM-POIs bleiben eine separate GeoJSON-Ebene. Namen auf der Basiskarte und Spezial-POIs haben verschiedene Quellen/Anzeigeverfahren.
- Die Quelldaten kommen aus zwei Regierungsbezirken, da Ulm/Neu-Ulm an der Landesgrenze liegt. Änderungen im Build können die Paketgröße beeinflussen. Eine Datei über 95 MB wird aus Sicherheitsgründen nicht committet.
- Die GitHub-Pages-App verwendet CDN-Bibliotheken, die bei der ersten Online-Nutzung durch den Service Worker zwischengespeichert werden. Danach können App und Karte offline geladen werden. Vor dem Offline-Test einmal online öffnen.
- Wegen Android-Hintergrundbeschränkungen läuft die GPS-Aufzeichnung bei ausgeschaltetem Bildschirm weiterhin nicht zuverlässig.
- Bereits gespeicherte persönliche Tourdaten nicht durch „Website-Daten schreddern“ löschen.
- Die gesamte 2.648,5-km-Komoot-Referenzroute bleibt enthalten (einschließlich Vama Veche und Ende Constanța). Die aktuelle Karten-Testregion umfasst nur Ulm.
- Der endgültige gesamte Offline-Korridor soll später **±50 km um die GPX** umfassen und in regionale Pakete geteilt werden. Die Ulm-Karte ist *nicht* dieser fertige Korridor.
- Der Kartenstil ist für unseren kleinen Pilot bewusst einfach. Er ersetzt noch keine ausgereifte OSM-Navigationskarte. Offline-Routing fehlt noch.

## Quellennachweise

Kartendaten © OpenStreetMap contributors, ODbL 1.0; Geofabrik-Extrakte: `download.geofabrik.de`.
Die PMTiles werden mit `systemed/tilemaker` erstellt. Eine zusätzliche Lizenz-/Attributionsprüfung ist vor einer breiten Veröffentlichung vorzunehmen.

## Aktualisierung POI-Import (18.11.2026)

Die Action **Outdoor-POIs importieren** verwendet jetzt direkt OSM-Rohdaten von Geofabrik mit **Osmium**, nicht mehr Overpass. Der bisherige 502-/Timeout-Fehler von Overpass wird dadurch umgangen. Nach dem Hochladen aller Dateien muss nur diese POI-Action neu gestartet werden; **die Offline-Testkarte muss nicht neu erstellt werden**, sofern sie bereits erfolgreich erzeugt wurde und unter `data/maps/ulm-test-z16.pmtiles` verfügbar ist. Der neue POI-GitHub-Workflow wurde noch nicht in GitHub Actions getestet.
