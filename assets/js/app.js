import { parseGpx, closestRoutePosition } from "./route.js";

const map = L.map("map", { zoomControl: true });
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const statusElement = document.getElementById("status");
const locationButton = document.getElementById("locate");
const formatKm = value => `${value.toFixed(1)} km`;
let route;
let locationMarker;
let locationCircle;
let watchId = null;

async function initialize() {
	try {
		const response = await fetch("./data/reference-route.gpx");
		if (!response.ok) {
			throw new Error(`GPX-Ladevorgang fehlgeschlagen (HTTP ${response.status}).`);
		}
		route = parseGpx(await response.text());
		const line = L.polyline(route.points.map(point => [point.lat, point.lon]), { color: "#0783f1", weight: 4 }).addTo(map);
		map.fitBounds(line.getBounds(), { padding: [15, 15] });
		document.getElementById("total").textContent = formatKm(route.totalKm);
		statusElement.textContent = "Referenzroute geladen. GPS kann jetzt gestartet werden. Kartendarstellung benötigt in dieser Version noch Internet.";
	} catch (error) {
		statusElement.textContent = `Fehler: ${error.message}`;
	}
}

function onPosition(position) {
	const location = { lat: position.coords.latitude, lon: position.coords.longitude };
	const latLng = [location.lat, location.lon];
	if (!locationMarker) {
		locationMarker = L.circleMarker(latLng, { radius: 7, color: "#ffffff", weight: 3, fillColor: "#007bff", fillOpacity: 1 }).addTo(map);
		locationCircle = L.circle(latLng, { radius: position.coords.accuracy, color: "#007bff", weight: 1, fillOpacity: 0.08 }).addTo(map);
	} else {
		locationMarker.setLatLng(latLng);
		locationCircle.setLatLng(latLng).setRadius(position.coords.accuracy);
	}
	map.setView(latLng, Math.max(map.getZoom(), 13));
	if (route) {
		const result = closestRoutePosition(route, location);
		document.getElementById("progress").textContent = formatKm(result.progressKm);
		document.getElementById("remaining").textContent = formatKm(Math.max(0, route.totalKm - result.progressKm));
		document.getElementById("offroute").textContent = `${Math.round(result.distanceKm * 1000)} m`;
		statusElement.textContent = result.distanceKm > 0.2
			? "Hinweis: GPS-Position liegt mehr als 200 m von der Referenzroute entfernt."
			: `GPS aktiv · Genauigkeit ca. ${Math.round(position.coords.accuracy)} m`;
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
		statusElement.textContent = "GPS angehalten.";
		return;
	}
	watchId = navigator.geolocation.watchPosition(onPosition, error => {
		statusElement.textContent = `GPS-Fehler: ${error.message}`;
	}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
	locationButton.textContent = "GPS stoppen";
});

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

initialize();
