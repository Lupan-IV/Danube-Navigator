import { parseGpx, closestRoutePosition, distanceKm } from "./route.js";
import { onlineStyle, TEST_BOUNDS } from "./map-style.js";
import { initializeOfflineMaps } from "./offline-maps.js";

const STORAGE_KEY = "danubeTourProgressV1";
const map = new maplibregl.Map({
	container: "map",
	center: [8.6, 48.0],
	zoom: 9,
	style: onlineStyle(),
	maxZoom: 19
});
map.addControl(new maplibregl.NavigationControl(), "top-left");
map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-left");

const statusElement = document.getElementById("status");
const locationButton = document.getElementById("locate");
const tourButton = document.getElementById("tour-toggle");
const resetButton = document.getElementById("tour-reset");
const formatKm = value => `${value.toFixed(1)} km`;

let route;
let routeBounds;
let locationMarker;
let watchId = null;
let currentPosition = null;
let previousRecordedPosition = null;
let tour = loadTour();

function loadTour() {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
		if (saved && Number.isFinite(saved.distanceKm) && saved.distanceKm >= 0) {
			return { started: Boolean(saved.started), active: false, distanceKm: saved.distanceKm };
		}
	} catch (error) {
		console.warn("Tour progress could not be loaded:", error);
	}
	return { started: false, active: false, distanceKm: 0 };
}

function saveTour() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify({
		started: tour.started,
		distanceKm: tour.distanceKm
	}));
}

function updateTourUI() {
	document.getElementById("progress").textContent = tour.started ? formatKm(tour.distanceKm) : "0.0 km";
	tourButton.textContent = tour.active ? "Tour pausieren" : tour.started ? "Tour fortsetzen" : "Tour starten";
	resetButton.disabled = !tour.started;
	document.getElementById("tour-state").textContent = tour.active ? "Tour läuft" : tour.started ? "Tour pausiert" : "Tour noch nicht gestartet";
}

function addRouteLayer() {
	if (!route || !map.isStyleLoaded()) {
		return;
	}
	if (map.getSource("danube-route")) {
		return;
	}
	map.addSource("danube-route", {
		type: "geojson",
		data: {
			type: "FeatureCollection",
			features: [{
				type: "Feature",
				properties: {},
				geometry: { type: "LineString", coordinates: route.points.map(point => [point.lon, point.lat]) }
			}]
		}
	});
	map.addLayer({
		id: "danube-route-line",
		type: "line",
		source: "danube-route",
		layout: { "line-join": "round", "line-cap": "round" },
		paint: { "line-color": "#087fee", "line-width": 4, "line-opacity": 0.85 }
	});
}

map.on("style.load", addRouteLayer);
map.on("error", error => console.warn("Map error:", error.error));

async function initialize() {
	updateTourUI();
	try {
		const response = await fetch("./data/reference-route.gpx");
		if (!response.ok) {
			throw new Error(`GPX-Ladevorgang fehlgeschlagen (HTTP ${response.status}).`);
		}
		route = parseGpx(await response.text());
		const bounds = new maplibregl.LngLatBounds();
		for (const point of route.points) {
			bounds.extend([point.lon, point.lat]);
		}
		routeBounds = bounds;
		addRouteLayer();
		map.fitBounds(TEST_BOUNDS, { padding: 25, maxZoom: 11 });
		document.getElementById("total").textContent = formatKm(route.totalKm);
		statusElement.textContent = "Referenzroute geladen. Offline-Karte kann separat installiert werden.";
	} catch (error) {
		statusElement.textContent = `Fehler: ${error.message}`;
	}
	await initializeOfflineMaps(map);
}

function recordDistance(position) {
	if (!tour.active) {
		return;
	}
	const accuracy = position.coords.accuracy;
	if (!Number.isFinite(accuracy) || accuracy > 50) {
		previousRecordedPosition = null;
		return;
	}
	const sample = {
		lat: position.coords.latitude,
		lon: position.coords.longitude,
		timestamp: position.timestamp,
		accuracy
	};
	if (previousRecordedPosition) {
		const seconds = (sample.timestamp - previousRecordedPosition.timestamp) / 1000;
		const meters = distanceKm(previousRecordedPosition, sample) * 1000;
		const threshold = Math.max(15, sample.accuracy, previousRecordedPosition.accuracy);
		if (seconds > 0 && seconds <= 120 && meters >= threshold && meters / seconds <= 15) {
			tour.distanceKm += meters / 1000;
			saveTour();
			previousRecordedPosition = sample;
		} else if (seconds > 120 || (seconds > 0 && meters / seconds > 15)) {
			previousRecordedPosition = sample;
		}
	} else {
		previousRecordedPosition = sample;
	}
	updateTourUI();
}

function onPosition(position) {
	currentPosition = position;
	const location = { lat: position.coords.latitude, lon: position.coords.longitude };
	const lngLat = [location.lon, location.lat];
	if (!locationMarker) {
		const markerElement = document.createElement("div");
		markerElement.className = "gps-dot";
		locationMarker = new maplibregl.Marker({ element: markerElement }).setLngLat(lngLat).addTo(map);
	} else {
		locationMarker.setLngLat(lngLat);
	}
	map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), 13), duration: 300 });
	recordDistance(position);
	if (route) {
		const result = closestRoutePosition(route, location);
		document.getElementById("route-position").textContent = formatKm(result.progressKm);
		document.getElementById("remaining").textContent = formatKm(Math.max(0, route.totalKm - result.progressKm));
		document.getElementById("offroute").textContent = result.distanceKm >= 1
			? `${result.distanceKm.toFixed(1)} km`
			: `${Math.round(result.distanceKm * 1000)} m`;
		statusElement.textContent = result.distanceKm > 0.2
			? "Hinweis: Du bist über 200 m von der Referenzroute entfernt. Routen-km und Restdistanz beziehen sich auf den nächstgelegenen Routenpunkt."
			: `GPS aktiv · Genauigkeit ca. ${Math.round(position.coords.accuracy)} m`;
	}
}

function pauseTour(message) {
	tour.active = false;
	previousRecordedPosition = null;
	saveTour();
	updateTourUI();
	if (message) {
		statusElement.textContent = message;
	}
}

locationButton.addEventListener("click", () => {
	if (!navigator.geolocation) {
		statusElement.textContent = "GPS wird von diesem Browser nicht unterstützt.";
		return;
	}
	if (watchId !== null) {
		navigator.geolocation.clearWatch(watchId);
		watchId = null;
		locationButton.textContent = "GPS starten";
		if (tour.active) {
			pauseTour("GPS gestoppt. Tour automatisch pausiert.");
		} else {
			statusElement.textContent = "GPS angehalten.";
		}
		return;
	}
	watchId = navigator.geolocation.watchPosition(onPosition, error => {
		statusElement.textContent = `GPS-Fehler: ${error.message}`;
	}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
	locationButton.textContent = "GPS stoppen";
});

tourButton.addEventListener("click", () => {
	if (tour.active) {
		pauseTour("Tour pausiert. Bereits gefahrene Distanz gespeichert.");
		return;
	}
	if (watchId === null || !currentPosition) {
		statusElement.textContent = "Bitte zuerst GPS starten und auf die Positionsbestimmung warten.";
		return;
	}
	tour.started = true;
	tour.active = true;
	previousRecordedPosition = null;
	saveTour();
	updateTourUI();
	statusElement.textContent = "Tour läuft. GPS-Aufzeichnung funktioniert aktuell nur mit geöffneter App.";
});

resetButton.addEventListener("click", () => {
	if (!confirm("Tourfortschritt wirklich auf 0 km zurücksetzen?")) {
		return;
	}
	tour = { started: false, active: false, distanceKm: 0 };
	previousRecordedPosition = null;
	saveTour();
	updateTourUI();
	statusElement.textContent = "Tourfortschritt zurückgesetzt.";
});

document.getElementById("view-test").addEventListener("click", () => {
	map.fitBounds(TEST_BOUNDS, { padding: 25, maxZoom: 11 });
});
document.getElementById("view-route").addEventListener("click", () => {
	if (routeBounds) {
		map.fitBounds(routeBounds, { padding: 25 });
	}
});

window.addEventListener("pagehide", () => {
	if (tour.active) {
		pauseTour();
	}
});

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(error => {
		console.warn("Service worker unavailable:", error);
	}));
}

initialize();
