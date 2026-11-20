#!/usr/bin/env bash
set -euo pipefail

# Download only tiles intersecting the exact buffered route polygon.
# pmtiles CLI: https://github.com/protomaps/go-pmtiles/releases
# Source: choose a current V4 planet build from https://maps.protomaps.com/builds

if [[ $# -ne 1 ]]; then
	echo 'Aufruf: ./build-map.sh https://build.protomaps.com/AKTUELLES-DATUM.pmtiles' >&2
	exit 2
fi
if ! command -v pmtiles >/dev/null 2>&1; then
	echo 'pmtiles CLI fehlt: https://github.com/protomaps/go-pmtiles/releases' >&2
	exit 2
fi

SOURCE="$1"
cd "$(dirname "$0")"
echo "Prüfe Kartenquelle: ${SOURCE}"
pmtiles show "$SOURCE" >/dev/null
echo 'Extrahiere den 50-km-Korridor bis Zoom 15. Diese Operation kann lange dauern.'
pmtiles extract "$SOURCE" './donau.pmtiles' --region='./corridor-50km.geojson' --maxzoom=15
pmtiles verify './donau.pmtiles'
echo 'Fertig: donau.pmtiles. Diese Datei NICHT in GitHub Pages hochladen.'
