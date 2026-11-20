import { onlineStyle, TEST_BOUNDS } from "./map-style.js";
import { initializeOfflineMaps } from "./offline-maps.js";
import { initializeOutdoorPOIs } from "./outdoor-pois.js";

const message = document.getElementById("map-message");
const gpsButton = document.getElementById("locate");
const panel = document.getElementById("panel");
const testButton = document.getElementById("view-test");

function setMessage(text) {
	message.textContent = text;
}

function togglePanel(open) {
	panel.hidden = !open;
}

document.getElementById("toggle-panel").addEventListener("click", () => togglePanel(panel.hidden));
document.getElementById("close-panel").addEventListener("click", () => togglePanel(false));

if (!window.maplibregl || !window.pmtiles) {
	setMessage("Kartenbibliotheken fehlen. Bitte App einmal online laden.");
} else {
	const map = new maplibregl.Map({
		container: "map",
		style: onlineStyle(),
		center: [9.993, 48.402],
		zoom: 12,
		maxZoom: 19,
		attributionControl: true
	});
	map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

	let gpsWatch = null;
	let marker = null;
	let firstFix = true;
	let accuracyRing = null;

	function showPosition(position) {
		const { latitude, longitude, accuracy } = position.coords;
		const coordinates = [longitude, latitude];
		if (!marker) {
			const dot = document.createElement("div");
			dot.className = "gps-dot";
			dot.style.cssText = "width:18px;height:18px;background:#1688ff;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 2px #2058a7;";
			marker = new maplibregl.Marker({ element: dot }).setLngLat(coordinates).addTo(map);
		} else {
			marker.setLngLat(coordinates);
		}
		if (firstFix) {
			map.easeTo({ center: coordinates, zoom: Math.max(14, map.getZoom()), duration: 600 });
			firstFix = false;
		}
		setMessage(`GPS aktiv · Genauigkeit etwa ${Math.round(accuracy)} m`);
	}

	gpsButton.addEventListener("click", () => {
		if (gpsWatch !== null) {
			navigator.geolocation.clearWatch(gpsWatch);
			gpsWatch = null;
			gpsButton.textContent = "GPS anzeigen";
			setMessage("GPS ausgeschaltet");
			return;
		}
		if (!navigator.geolocation) {
			setMessage("GPS wird von diesem Browser nicht unterstützt.");
			return;
		}
		firstFix = true;
		gpsButton.textContent = "GPS ausschalten";
		setMessage("GPS-Position wird gesucht …");
		gpsWatch = navigator.geolocation.watchPosition(showPosition, error => {
			setMessage(`GPS-Fehler: ${error.message}`);
		}, { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 });
	});

	testButton.addEventListener("click", () => map.fitBounds(TEST_BOUNDS, { padding: 25, duration: 600 }));
	map.on("error", event => console.warn("Kartenfehler:", event.error));
	initializeOutdoorPOIs(map);
	initializeOfflineMaps(map).then(() => {
		setMessage("Karte bereit · GPS bei Bedarf einschalten");
	}).catch(error => {
		setMessage(`Kartenfehler: ${error.message}`);
	});
}

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Offline-App:", error));
	});
}
