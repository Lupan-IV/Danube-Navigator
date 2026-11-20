# Donau Offlinekarte – Neuaufbau

Eine minimalistische, serverlose PWA auf Basis von MapLibre, PMTiles und Protomaps Basemaps V4. Enthält die hochgeladene GPX-Strecke (in der Datei als Donaueschingen–Vama Veche bezeichnet; der letzte Trackpunkt liegt allerdings bei 44.190461 N, 28.622170 E im Raum Constanța). **50-km-Korridor = 25 km beiderseits der Route**, ermittelt aus der mitgelieferten GPX-Datei. Kartenausschnitt ca. 112.120 km².

## Einmalig vorbereiten

1. `python prepare_assets.py` im Projektordner ausführen. Dieses Skript lädt die exakt festgelegten JS-Versionen, lokale Zeichensätze und Icons. Ohne diese Vorbereitung ist die App noch nicht startbereit. Eine Verbindung zu den Anbietern ist dafür einmalig nötig.
2. Die kleinen Projektdateien **einschließlich `vendor/` und `assets/`** auf GitHub Pages veröffentlichen. `route.geojson`, `app.js`, `sw.js`, `index.html`, `style.css`, `manifest.webmanifest` gehören dazu. `prepare_assets.py`, `build-map.sh` und `corridor-50km.geojson` werden nicht von der PWA benötigt. Kein GitHub Actions-Workflow ist nötig.
3. Für die eigentliche Karte die offizielle `pmtiles` CLI herunterladen: https://github.com/protomaps/go-pmtiles/releases. Auf https://maps.protomaps.com/builds eine verfügbare **Version-4-Basemap** auswählen. Danach im WSL-Terminal:

   ```bash
   ./build-map.sh 'https://build.protomaps.com/AKTUELLE-V4-DATEI.pmtiles'
   ```

   Die Adresse ist **nur ein Platzhalter**: Täglich wechseln die Builds und alte Links können verschwinden. `build-map.sh` prüft die Quelle vor dem Download und extrahiert mit `--region=...` ein *einzelnes* PMTiles-Archiv, nur im 50-km-Korridor, bis Zoom 15.
4. `donau.pmtiles` separat aufs Android-Handy kopieren. In der PWA unter „Karte“ die Datei auswählen. Alternativ eine **CORS-fähige HTTPS-Direktadresse** eintragen und die Datei dort herunterladen. Danach wird sie dauerhaft im OPFS (dem privaten Browser-Dateisystem) gespeichert. Im normalen Betrieb ist kein Kartenserver nötig.

**Wichtig:** Ein 20-GB-Archiv wird nicht auf GitHub Pages gespeichert. Die tatsächliche Dateigröße hängt von der gewählten OSM-Version ab; sie lässt sich erst nach der Extraktion zuverlässig angeben. Auf Android sind außerdem genügend freier interner Speicher und Browser-Speicherquote erforderlich. Bei manueller Dateiübernahme ist zeitweise zusätzlicher Speicher nötig.

## Funktionsumfang

- Offline-Vektorgrundkarte mit Straßen, Gebäuden, Gewässern, Wäldern und **lokal eingebundenen** Beschriftungen/Symbolen, sofern die Daten in den Protomaps-Tiles vorliegen.
- Zoomstufe 0–15, Vergrößerung auf 16.
- GPX-Strecke als Linie, ohne Navigation.
- Thematisch ein-/ausblendbare, anklickbare POIs direkt aus der Protomaps-OSM-Ebene `pois`. Bei Zoom 11+ werden Punkte hervorgehoben. Die zugänglichen Detailinformationen sind auf in Protomaps enthaltene Attribute beschränkt. **Nicht alle OSM-POIs oder ihre vollständigen OSM-Tags sind enthalten**, insbesondere manche Höhlen, Ruinen und Unterstände können fehlen. Eine vollständige POI-Rohdatenextraktion wird nicht vorgetäuscht.
- GPS-Standort: Einschalten mit ◎, einmalige Zentrierung, ausschalten mit erneutem Tippen. Keine Aufzeichnung.
- PMTiles-Import bzw. Download und Speichern in OPFS über Browser-Neustarts hinweg.
- PWA-Service-Worker speichert **nur App, Zeichensätze und Symbole**; die große Karte liegt separat in OPFS.

## Hinweise und Grenzen

- Die PWA unter HTTPS (GitHub Pages) nutzen, nicht per `file://` öffnen. Zum lokalen Testen geht z. B. `python -m http.server` auf dem Rechner.
- Die offline-tauglichen Zeichenbereiche decken lateinische Zeichen, griechische und kyrillische Schrift sowie relevante Sonderzeichen ab. Andere Unicode-Zeichen außerhalb der vorbereiteten Glyph-Bereiche können bei vollständig offline genutzter Karte fehlen.
- POIs beruhen auf dem in Protomaps enthaltenen kuratierten OSM-Subset. Für eine wirklich vollständige Roh-OSM-POI-Sammlung ist später eine **separate OSM-Datenextraktion** nötig. Sie wurde hier bewusst nicht von störanfälligen Overpass-Endpunkten abhängig gemacht.
- Die Browserdaten / den Speicher dieser Website nicht löschen, sonst geht die lokal gespeicherte Karte verloren. Das gilt auch für eine Datenbereinigung durch Android bei Speichermangel. Die aus der GPX abgeleitete Route bleibt als Projektdatei auf GitHub Pages.
- Kartenerstellung und JS-Abhängigkeiten wurden anhand offizieller Dokumentation ausgewählt; die großen Kartendaten und externen Bibliotheken konnten in dieser Laufzeit **nicht tatsächlich heruntergeladen und mit Android getestet werden**.

## Technische Nachweise

- https://docs.protomaps.com/pmtiles/cli (GeoJSON `--region`, remote `extract`, `verify`)
- https://docs.protomaps.com/basemaps/maplibre (Basemaps V4-Styles)
- https://docs.protomaps.com/basemaps/downloads (verfügbare Planet-Builds)
- https://docs.protomaps.com/basemaps/layers (`pois`, Datenumfang)
- https://github.com/protomaps/basemaps-assets (Fontdateien und Sprites)
- https://github.com/protomaps/PMTiles (FileSource)
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits (Github Pages Größenlimits)
