const OSM_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

export const TEST_BOUNDS = [[8.43, 47.89], [8.91, 48.15]];

export function onlineStyle() {
	return {
		version: 8,
		sources: {
			osm: {
				type: "raster",
				tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
				tileSize: 256,
				attribution: OSM_ATTRIBUTION,
				maxzoom: 19
			}
		},
		layers: [{ id: "osm", type: "raster", source: "osm" }]
	};
}

export function offlineStyle(fileName) {
	return {
		version: 8,
		glyphs: "./assets/fonts/{fontstack}/{range}.pbf",
		sources: {
			basemap: {
				type: "vector",
				url: `pmtiles://${fileName}`,
				attribution: OSM_ATTRIBUTION
			}
		},
		layers: [
			{ id: "background", type: "background", paint: { "background-color": "#edf0e9" } },
			{
				id: "landuse", type: "fill", source: "basemap", "source-layer": "landuse",
				paint: {
					"fill-color": ["match", ["get", "kind"],
						["forest", "wood", "park", "nature_reserve"], "#c7daba",
						["grass", "meadow", "recreation_ground", "garden"], "#d6e5c3",
						["residential", "commercial"], "#e9e7df",
						"#e6e6d8"],
					"fill-opacity": 0.85
				}
			},
			{
				id: "water", type: "fill", source: "basemap", "source-layer": "water",
				filter: ["==", ["geometry-type"], "Polygon"],
				paint: { "fill-color": "#a4cadb" }
			},
			{
				id: "water-lines", type: "line", source: "basemap", "source-layer": "water",
				filter: ["==", ["geometry-type"], "LineString"],
				paint: { "line-color": "#8ebccc", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 2] }
			},
			{
				id: "buildings", type: "fill", source: "basemap", "source-layer": "buildings",
				minzoom: 12,
				paint: { "fill-color": "#c8c7bf", "fill-outline-color": "#b4b2ac" }
			},
			{
				id: "roads", type: "line", source: "basemap", "source-layer": "roads",
				paint: {
					"line-color": ["match", ["get", "kind_detail"],
						["cycleway", "path", "footway", "pedestrian"], "#5b9276",
						["motorway", "trunk", "primary", "secondary"], "#e6b87a",
						"#fffdfa"],
					"line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 12, 1.5, 16, 4]
				}
			},
			{
				id: "water-labels",
				type: "symbol",
				source: "basemap",
				"source-layer": "water",
				filter: ["==", ["geometry-type"], "LineString"],
				minzoom: 11,
				layout: {
					"symbol-placement": "line",
					"text-field": ["coalesce", ["get", "name"], ""],
					"text-font": ["Noto Sans Regular"],
					"text-size": 11,
					"text-max-angle": 35
				},
				paint: { "text-color": "#477797", "text-halo-color": "#f1f6f4", "text-halo-width": 1.5 }
			},
			{
				id: "road-labels",
				type: "symbol",
				source: "basemap",
				"source-layer": "roads",
				filter: ["==", ["geometry-type"], "LineString"],
				minzoom: 13,
				layout: {
					"symbol-placement": "line",
					"text-field": ["coalesce", ["get", "name"], ""],
					"text-font": ["Noto Sans Regular"],
					"text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 16, 13],
					"text-max-angle": 35,
					"symbol-spacing": 350
				},
				paint: { "text-color": "#5a5a55", "text-halo-color": "#f9f9f3", "text-halo-width": 2 }
			},
			{
				id: "place-labels",
				type: "symbol",
				source: "basemap",
				"source-layer": "places",
				minzoom: 6,
				layout: {
					"text-field": ["coalesce", ["get", "name"], ""],
					"text-font": ["Noto Sans Regular"],
					"text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 10, 13, 15, 16],
					"text-max-width": 8,
					"text-optional": true
				},
				paint: { "text-color": "#243c4c", "text-halo-color": "#f9f9f3", "text-halo-width": 2 }
			}
		]
	};
}
