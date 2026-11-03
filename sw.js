const CACHE_NAME = "danube-shell-v3-pmtiles-1";
const LOCAL_FILES = [
	"./",
	"./index.html",
	"./manifest.webmanifest",
	"./assets/css/app.css",
	"./assets/js/app.js",
	"./assets/js/route.js",
	"./assets/js/map-style.js",
	"./assets/js/offline-maps.js",
	"./data/reference-route.gpx"
];
const CDN_FILES = [
	"https://cdn.jsdelivr.net/npm/maplibre-gl@6.16.0/dist/maplibre-gl.css",
	"https://cdn.jsdelivr.net/npm/maplibre-gl@6.16.0/dist/maplibre-gl.js",
	"https://cdn.jsdelivr.net/npm/pmtiles@4.5.0/dist/pmtiles.js"
];

self.addEventListener("install", event => {
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE_NAME);
		await cache.addAll(LOCAL_FILES);
		await Promise.allSettled(CDN_FILES.map(url => cache.add(url)));
		await self.skipWaiting();
	})());
});

self.addEventListener("activate", event => {
	event.waitUntil((async () => {
		const keys = await caches.keys();
		await Promise.all(keys.filter(key => key.startsWith("danube-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
		await self.clients.claim();
	})());
});

self.addEventListener("fetch", event => {
	if (event.request.method !== "GET") {
		return;
	}
	const url = new URL(event.request.url);
	if (url.pathname.endsWith(".pmtiles") || url.hostname === "tile.openstreetmap.org") {
		return;
	}
	const local = url.origin === self.location.origin;
	const fromCdn = CDN_FILES.includes(url.href);
	if (!local && !fromCdn) {
		return;
	}
	event.respondWith((async () => {
		const cache = await caches.open(CACHE_NAME);
		if (fromCdn) {
			const cached = await cache.match(event.request);
			if (cached) {
				return cached;
			}
			const response = await fetch(event.request);
			if (response.ok) {
				await cache.put(event.request, response.clone());
			}
			return response;
		}
		try {
			const response = await fetch(event.request);
			if (response.ok) {
				await cache.put(event.request, response.clone());
			}
			return response;
		} catch (error) {
			const cached = await cache.match(event.request);
			if (cached) {
				return cached;
			}
			throw error;
		}
	})());
});
