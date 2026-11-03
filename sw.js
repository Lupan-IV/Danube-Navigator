const CACHE_NAME = "danube-shell-v2";
const FILES = [
	"./",
	"./index.html",
	"./manifest.webmanifest",
	"./assets/css/app.css",
	"./assets/js/app.js",
	"./assets/js/route.js",
	"./data/reference-route.gpx",
	"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
	"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", event => {
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE_NAME);
		await cache.addAll(FILES.filter(url => url.startsWith("./")));
		await Promise.allSettled(FILES.filter(url => url.startsWith("https://")).map(url => cache.add(url)));
		await self.skipWaiting();
	})());
});

self.addEventListener("activate", event => {
	event.waitUntil((async () => {
		await Promise.all((await caches.keys()).filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
		await self.clients.claim();
	})());
});

self.addEventListener("fetch", event => {
	if (event.request.method !== "GET") {
		return;
	}
	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin && url.hostname !== "unpkg.com") {
		return;
	}
	event.respondWith((async () => {
		const cached = await caches.match(event.request);
		if (cached) {
			return cached;
		}
		return fetch(event.request);
	})());
});
