# Danube Navigator

Independent successor project to the Peaks of the Balkans trail assistant.
The original PoB repository remains unchanged.

## Phase 2 prototype

- Temporary Komoot reference GPX (`data/reference-route.gpx`)
- Leaflet map and reference route
- Browser GPS position, route progress, distance to route, remaining distance
- Small PWA shell cache
- Modular JavaScript/CSS structure

## Known limitations

- **No offline base map yet.** OpenStreetMap map tiles require internet. The app shell and reference GPX are cached after the first successful online load.
- The GPS progress calculation uses the geographically nearest route segment. It can jump at crossings or parallel stretches; map matching will be improved.
- No independent offline bicycle routing or rerouting yet.
- No POI / stage / backup features yet.
- The PoB application is a feature reference, not copied verbatim: its weather, water, stages, and interface are intentionally deferred until modular migration.

## Deployment

Upload the *contents* of this folder to the root of the public GitHub repository, then enable GitHub Pages under Settings > Pages > Deploy from a branch > main / root.
The site will be served at `https://lupan-iv.github.io/Danube-Navigator/`.
For a local development server, open the folder with an HTTP server. Do not open index.html via `file://`.

## Data sources

- Route: user-provided temporary Komoot GPX (not final).
- Map tiles: © OpenStreetMap contributors, online only.
