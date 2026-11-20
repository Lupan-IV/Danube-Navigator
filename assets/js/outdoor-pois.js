const POI_URL = "./data/pois/outdoor-test.geojson";

const CATEGORIES = {
	water: { label: "Trinkwasser", color: "#2780cf" },
	shop: { label: "Supermärkte", color: "#e37c33" },
	bakery: { label: "Bäckereien", color: "#b97138" },
	food: { label: "Essen & Cafés", color: "#db6157" },
	camp: { label: "Camping", color: "#589f58" },
	lodging: { label: "Unterkünfte", color: "#855cb3" },
	bike: { label: "Radservice", color: "#336eae" },
	toilets: { label: "Toiletten", color: "#577a9c" },
	transport: { label: "Bahnhof / Fähre", color: "#616b8a" },
	medical: { label: "Apotheke / Arzt", color: "#cc536a" },
	shelter: { label: "Schutzhütten", color: "#3c8d57" },
	wilderness_hut: { label: "Wildnishütten", color: "#206b40" },
	cave: { label: "Höhlen", color: "#7351a1" },
	rock_shelter: { label: "Felsüberhänge", color: "#a26d39" },
	firepit: { label: "Feuerstellen", color: "#d96b29" },
	picnic: { label: "Picknickplätze", color: "#83a838" },
	castle_ruin: { label: "Burgruinen", color: "#b14f65" },
	ruin: { label: "Sonstige Ruinen", color: "#87677a" },
	scenic: { label: "Sehenswertes", color: "#b0a041" },
	beach: { label: "Badestellen", color: "#2d9b9f" }
};

const SOURCE_ID = "outdoor-pois";
const LAYER_ID = "outdoor-poi-circles";
const state = document.getElementById("outdoor-poi-state");
const filters = document.getElementById("outdoor-poi-filters");

const emptyCollection = { type: "FeatureCollection", features: [] };
let collection = emptyCollection;
let map;
let activePopup;
const selectedCategories = new Set(Object.keys(CATEGORIES));

function setupFilters() {
	for (const [category, config] of Object.entries(CATEGORIES)) {
		const label = document.createElement("label");
		label.className = "poi-filter";
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = true;
		checkbox.dataset.category = category;
		checkbox.addEventListener("change", () => {
			if (checkbox.checked) {
				selectedCategories.add(category);
			} else {
				selectedCategories.delete(category);
			}
			applyFilter();
		});
		const swatch = document.createElement("span");
		swatch.className = "poi-swatch";
		swatch.style.backgroundColor = config.color;
		const title = document.createElement("span");
		title.textContent = config.label;
		const count = document.createElement("small");
		count.dataset.countCategory = category;
		count.textContent = "0";
		label.append(checkbox, swatch, title, count);
		filters.append(label);
	}
}

function categoryColorExpression() {
	const entries = Object.entries(CATEGORIES).flatMap(([category, config]) => [category, config.color]);
	return ["match", ["get", "category"], ...entries, "#787878"];
}

function drawLayer() {
	if (!map.isStyleLoaded()) {
		return;
	}
	if (!map.getSource(SOURCE_ID)) {
		map.addSource(SOURCE_ID, { type: "geojson", data: collection });
	}
	if (!map.getLayer(LAYER_ID)) {
		map.addLayer({
			id: LAYER_ID,
			type: "circle",
			source: SOURCE_ID,
			minzoom: 10,
			paint: {
				"circle-color": categoryColorExpression(),
				"circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 13, 4.5, 16, 7],
				"circle-stroke-color": "#ffffff",
				"circle-stroke-width": 1.2,
				"circle-opacity": 0.95
			}
		});
	}
	applyFilter();
}

function applyFilter() {
	if (!map.getLayer(LAYER_ID)) {
		return;
	}
	map.setFilter(LAYER_ID, ["in", ["get", "category"], ["literal", [...selectedCategories]]]);
}

function appendDetail(parent, label, value) {
	if (!value) {
		return;
	}
	const row = document.createElement("div");
	const strong = document.createElement("strong");
	strong.textContent = `${label}: `;
	row.append(strong, document.createTextNode(String(value)));
	parent.append(row);
}

function popupFor(feature, coordinates) {
	activePopup?.remove();
	const properties = feature.properties || {};
	const panel = document.createElement("div");
	panel.className = "poi-popup";
	const heading = document.createElement("strong");
	heading.textContent = properties.name || properties.label || "Outdoor-POI";
	panel.append(heading);
	appendDetail(panel, "Kategorie", properties.label);
	appendDetail(panel, "Zugang", properties.access);
	appendDetail(panel, "Typ", properties.shelter_type);
	appendDetail(panel, "Feuerstelle", properties.fireplace);
	appendDetail(panel, "Trinkwasser", properties.drinking_water);
	appendDetail(panel, "Beschreibung", properties.description);
	appendDetail(panel, "Hinweis", properties.note);
	if (["node", "way", "relation"].includes(properties.osm_type) && Number.isInteger(Number(properties.osm_id))) {
		const link = document.createElement("a");
		link.href = `https://www.openstreetmap.org/${properties.osm_type}/${Number(properties.osm_id)}`;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = "In OpenStreetMap ansehen";
		panel.append(link);
	}
	activePopup = new maplibregl.Popup({ maxWidth: "290px" }).setLngLat(coordinates).setDOMContent(panel).addTo(map);
}

async function loadPOIs() {
	state.textContent = "Lade OSM-POIs …";
	try {
		const response = await fetch(POI_URL);
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error("POI-Datei fehlt. GitHub-Action ‚Outdoor-POIs importieren‘ ausführen.");
			}
			throw new Error(`HTTP ${response.status}`);
		}
		const data = await response.json();
		if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
			throw new Error("Ungültige POI-Datei.");
		}
		collection = data;
		const counts = {};
		for (const feature of collection.features) {
			const category = feature.properties?.category;
			counts[category] = (counts[category] || 0) + 1;
		}
		for (const [category, number] of Object.entries(counts)) {
			const counter = filters.querySelector(`[data-count-category="${category}"]`);
			if (counter) {
				counter.textContent = String(number);
			}
		}
		state.textContent = `${collection.features.length} Outdoor-POIs geladen · offline verfügbar nach Online-Aufruf`;
		if (map.getSource(SOURCE_ID)) {
			map.getSource(SOURCE_ID).setData(collection);
		} else {
			drawLayer();
		}
	} catch (error) {
		state.textContent = `Outdoor-POIs nicht geladen: ${error.message}`;
	}
}

export function initializeOutdoorPOIs(mapInstance) {
	map = mapInstance;
	setupFilters();
	map.on("style.load", drawLayer);
	map.on("click", event => {
		if (!map.getLayer(LAYER_ID)) {
			return;
		}
		const features = map.queryRenderedFeatures(event.point, { layers: [LAYER_ID] });
		if (!features.length) {
			return;
		}
		popupFor(features[0], features[0].geometry.coordinates);
	});
	map.on("mousemove", event => {
		if (!map.getLayer(LAYER_ID)) {
			return;
		}
		map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers: [LAYER_ID] }).length ? "pointer" : "";
	});
	loadPOIs();
}
