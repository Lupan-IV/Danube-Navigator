/* Never cache the giant PMTiles archive here. It lives separately in OPFS. */
const VERSION = 'danube-app-v1';
const CORE = [
	'./', './index.html', './app.js', './style.css', './route.geojson',
	'./manifest.webmanifest', './icon-192.png', './icon-512.png', './vendor/maplibre-gl.js',
	'./vendor/maplibre-gl.css', './vendor/pmtiles.js',
	'./vendor/basemaps.js',
	'./assets/sprites/v4/light.json', './assets/sprites/v4/light.png',
	'./assets/sprites/v4/light@2x.json', './assets/sprites/v4/light@2x.png'
];
const FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
const RANGES = ['0-255','256-511','512-767','768-1023','1024-1279','1280-1535','7680-7935','8192-8447'];
for (const font of FONTS) {
	for (const range of RANGES) {
		CORE.push(`./assets/fonts/${encodeURIComponent(font)}/${range}.pbf`);
	}
}
self.addEventListener('install', event => {
	event.waitUntil((async () => {
		const cache = await caches.open(VERSION);
		for (const path of CORE) {
			await cache.add(new Request(path, {cache: 'reload'}));
		}
		await self.skipWaiting();
	})());
});
self.addEventListener('activate', event => {
	event.waitUntil((async () => {
		for (const key of await caches.keys()) {
			if (key.startsWith('danube-app-') && key !== VERSION) await caches.delete(key);
		}
		await self.clients.claim();
	})());
});
self.addEventListener('fetch', event => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
	if (url.pathname.endsWith('.pmtiles')) return;
	event.respondWith((async () => {
		const cache = await caches.open(VERSION);
		try {
			const response = await fetch(request);
			if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
			return response;
		} catch {
			const cached = await cache.match(request, {ignoreSearch: true});
			return cached || Response.error();
		}
	})());
});
