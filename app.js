'use strict';

// Deliberately small: local basemap, OSM POIs already present in its vector tiles,
// route, GPS, and persistent offline file storage. No routing or tracking.
const ARCHIVE_NAME = 'donau.pmtiles';
const DOWNLOADING_KEY = 'donau-download-url';
const COMPLETE_KEY = 'donau-map-complete';
const ROUTE_BOUNDS = [[8.502446, 43.653860], [28.650438, 49.029384]];
const CATEGORY_SETS = [
	['Wasser', ['drinking_water', 'water_point', 'spring']],
	['Einkaufen & Essen', ['supermarket', 'grocery', 'convenience', 'bakery', 'restaurant', 'fast_food', 'cafe', 'greengrocer']],
	['Übernachten', ['camp_site', 'caravan_site', 'hotel', 'hostel', 'guest_house', 'bed_and_breakfast', 'motel', 'chalet']],
	['Schutzhütten', ['shelter', 'alpine_hut', 'wilderness_hut']],
	['Höhlen & Felsen', ['cave_entrance', 'rock_shelter', 'rock', 'cliff']],
	['Ruinen', ['ruins', 'castle', 'fort', 'archaeological_site']],
	['Feuer & Picknick', ['firepit', 'bbq', 'picnic_site', 'picnic_table']],
	['Fahrradservice', ['bicycle', 'bicycle_repair_station', 'bicycle_shop']],
	['Toiletten', ['toilets']],
	['Gesundheit', ['pharmacy', 'hospital', 'clinic']],
	['Bahnhöfe & Fähren', ['station', 'halt', 'ferry_terminal']],
	['Sehenswürdigkeiten', ['attraction', 'viewpoint', 'artwork', 'monument', 'museum', 'landmark']]
];
const CATEGORY_COLORS = ['#0982c2', '#ed8a25', '#aa58ba', '#3d8d67', '#776c54', '#a66a40', '#db6a31', '#377ca7', '#438d9d', '#df484d', '#4a6ab5', '#8f61a3'];
const enabled = new Set(CATEGORY_SETS.map((_, index) => index));
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);
let map;
let archive;
let gpsWatch = null;
let gpsCentered = false;
let busy = false;

const el = name => document.getElementById(name);
const mb = bytes => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function setStatus(message) {
	el('status').textContent = message;
}

function setDownloadStatus(message) {
	el('download-status').textContent = message;
}

function togglePanel(id) {
	for (const panel of ['poi-panel', 'storage-panel']) {
		el(panel).classList.toggle('hidden', panel !== id || !el(panel).classList.contains('hidden'));
	}
}

function buildStyle() {
	const basemap = archive ? basemaps.layers('basemap', basemaps.namedFlavor('light'), {lang: 'en'}) : [];
	const filtered = basemap.filter(layer => layer['source-layer'] !== 'pois');
	const sources = {};
	if (archive) {
		sources.basemap = {
			type: 'vector',
			url: `pmtiles://${ARCHIVE_NAME}`,
			maxzoom: 15,
			attribution: '© OpenStreetMap contributors · Protomaps'
		};
	}
	sources.route = {type: 'geojson', data: './route.geojson'};
	sources.location = {type: 'geojson', data: {type: 'FeatureCollection', features: []}};

	const layers = [
		{ id: 'background-local', type: 'background', paint: {'background-color': '#e9f0f1'} },
		...filtered,
		{
			id: 'route-line-outline', type: 'line', source: 'route',
			paint: {'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2, 16, 7]}
		},
		{
			id: 'route-line', type: 'line', source: 'route',
			paint: {'line-color': '#0067c5', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 16, 3.5]}
		}
	];
	if (archive) {
		CATEGORY_SETS.forEach(([name, kinds], index) => {
			layers.push({
				id: `poi-${index}`, type: 'circle', source: 'basemap', 'source-layer': 'pois',
				minzoom: 11, filter: ['in', ['get', 'kind'], ['literal', kinds]],
				layout: {visibility: enabled.has(index) ? 'visible' : 'none'},
				paint: {
					'circle-color': CATEGORY_COLORS[index], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 15, 6],
					'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.3, 'circle-opacity': 0.95
				}
			});
		});
	}
	layers.push({
		id: 'gps-accuracy', type: 'circle', source: 'location',
		paint: {'circle-color': '#1978db', 'circle-opacity': 0.1, 'circle-radius': 20}
	});
	layers.push({
		id: 'gps-dot', type: 'circle', source: 'location',
		paint: {'circle-color': '#147be6', 'circle-radius': 8, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3}
	});
	return {
		version: 8,
		glyphs: `${new URL('./', document.baseURI).href}assets/fonts/{fontstack}/{range}.pbf`,
		sprite: new URL('./assets/sprites/v4/light', document.baseURI).href,
		sources,
		layers
	};
}

function popupFor(feature, lngLat, group) {
	const container = document.createElement('div');
	const title = document.createElement('strong');
	title.textContent = feature.properties.name || group;
	container.appendChild(title);
	const items = [['Kategorie', group], ['OSM-Typ', feature.properties.kind], ['Küche', feature.properties.cuisine]];
	for (const [key, value] of items) {
		if (value == null || value === '') continue;
		const row = document.createElement('div');
		row.className = 'detail';
		row.textContent = `${key}: ${value}`;
		container.appendChild(row);
	}
	new maplibregl.Popup({offset: 12, maxWidth: '300px'}).setLngLat(lngLat).setDOMContent(container).addTo(map);
}

function installPoiClicks() {
	if (!archive) return;
	CATEGORY_SETS.forEach(([name], index) => {
		const id = `poi-${index}`;
		map.on('click', id, event => {
			if (!event.features?.length) return;
			popupFor(event.features[0], event.lngLat, name);
		});
		map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
		map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
	});
}

function reloadStyle() {
	map.setStyle(buildStyle());
	map.once('style.load', installPoiClicks);
}

async function storageRoot() {
	if (!navigator.storage?.getDirectory) throw new Error('Dieser Browser unterstützt OPFS nicht. Bitte aktuelles Chrome für Android verwenden.');
	return navigator.storage.getDirectory();
}

async function removeArchiveFile() {
	const root = await storageRoot();
	try { await root.removeEntry(ARCHIVE_NAME); } catch (error) { if (error.name !== 'NotFoundError') throw error; }
}

async function loadArchive() {
	if (localStorage.getItem(COMPLETE_KEY) !== 'yes') return false;
	const root = await storageRoot();
	const handle = await root.getFileHandle(ARCHIVE_NAME);
	const file = await handle.getFile();
	const pm = new pmtiles.PMTiles(new pmtiles.FileSource(file));
	const header = await pm.getHeader();
	if (header.tileType !== 1) throw new Error('Nur PMTiles-Vektorkarten (MVT) werden unterstützt.');
	archive = pm;
	protocol.add(pm);
	el('storage-info').textContent = `Gespeichert: ${mb(file.size)} · Zoom ${header.minZoom}–${header.maxZoom}`;
	el('remove').disabled = false;
	setStatus(`Offline-Karte bereit · bis Zoom ${header.maxZoom}`);
	return true;
}

async function refreshArchive() {
	try {
		await loadArchive();
		reloadStyle();
	} catch (error) {
		setStatus(`Karte konnte nicht geladen werden: ${error.message}`);
	}
}

function setBusy(value) {
	busy = value;
	el('download').disabled = value;
	el('map-file').disabled = value;
	el('remove').disabled = value || !archive;
}

async function streamToStorage(stream, total, resume = false) {
	const root = await storageRoot();
	const handle = await root.getFileHandle(ARCHIVE_NAME, {create: true});
	const oldSize = resume ? (await handle.getFile()).size : 0;
	const writable = await handle.createWritable({keepExistingData: resume});
	if (resume) await writable.seek(oldSize);
	let loaded = oldSize;
	const reader = stream.getReader();
	const progress = el('progress');
	progress.classList.remove('hidden');
	try {
		while (true) {
			const {done, value} = await reader.read();
			if (done) break;
			await writable.write(value);
			loaded += value.byteLength;
			progress.value = total ? loaded / total * 100 : 0;
			setDownloadStatus(`${mb(loaded)}${total ? ` / ${mb(total)}` : ''}`);
		}
		await writable.close();
		if (total && loaded !== total) throw new Error(`Unvollständiger Download (${mb(loaded)} von ${mb(total)})`);
		const pm = new pmtiles.PMTiles(new pmtiles.FileSource(await handle.getFile()));
		const header = await pm.getHeader();
		if (header.tileType !== 1 || header.maxZoom < 1) throw new Error('Datei ist kein gültiges Vektor-PMTiles-Kartenpaket.');
		localStorage.setItem(COMPLETE_KEY, 'yes');
		localStorage.removeItem(DOWNLOADING_KEY);
		await refreshArchive();
		setDownloadStatus('Fertig – Karte dauerhaft gespeichert.');
	} catch (error) {
		try { await writable.close(); } catch { /* Already closed */ }
		throw error;
	} finally {
		progress.classList.add('hidden');
		reader.releaseLock();
	}
}

async function importFile(file) {
	if (!file || busy) return;
	setBusy(true);
	try {
		localStorage.removeItem(COMPLETE_KEY);
		localStorage.removeItem(DOWNLOADING_KEY);
		await streamToStorage(file.stream(), file.size);
	} catch (error) {
		await removeArchiveFile();
		setDownloadStatus(`Import fehlgeschlagen: ${error.message}`);
	} finally {
		setBusy(false);
		el('map-file').value = '';
	}
}

async function downloadArchive() {
	if (busy) return;
	const url = el('map-url').value.trim();
	if (!/^https:\/\//i.test(url)) {
		setDownloadStatus('Bitte eine HTTPS-Adresse zu einer .pmtiles-Datei eingeben.');
		return;
	}
	setBusy(true);
	try {
		await navigator.storage.persist?.();
		const root = await storageRoot();
		const sameUrl = localStorage.getItem(DOWNLOADING_KEY) === url && localStorage.getItem(COMPLETE_KEY) !== 'yes';
		const partialSize = sameUrl ? (await root.getFileHandle(ARCHIVE_NAME, {create: true}).then(h => h.getFile())).size : 0;
		const response = await fetch(url, {headers: partialSize ? {Range: `bytes=${partialSize}-`} : {}, cache: 'no-store'});
		if (!(response.ok && response.body)) throw new Error(`Serverantwort ${response.status}; möglicherweise fehlt CORS.`);
		const resume = partialSize > 0 && response.status === 206;
		const contentRange = response.headers.get('Content-Range');
		const fullLength = resume && contentRange ? Number(contentRange.match(/\/(\d+)$/)?.[1]) : Number(response.headers.get('Content-Length'));
		const total = Number.isFinite(fullLength) && fullLength > 0 ? (resume ? fullLength : fullLength) : 0;
		localStorage.removeItem(COMPLETE_KEY);
		localStorage.setItem(DOWNLOADING_KEY, url);
		await streamToStorage(response.body, total, resume);
	} catch (error) {
		setDownloadStatus(`Download unterbrochen: ${error.message}. Erneutes Klicken versucht die Fortsetzung.`);
	} finally {
		setBusy(false);
	}
}

function buildCategories() {
	CATEGORY_SETS.forEach(([name], index) => {
		const label = document.createElement('label');
		label.className = 'category';
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = true;
		input.addEventListener('change', () => {
			if (input.checked) enabled.add(index); else enabled.delete(index);
			if (map?.getLayer(`poi-${index}`)) map.setLayoutProperty(`poi-${index}`, 'visibility', input.checked ? 'visible' : 'none');
		});
		label.append(input, document.createTextNode(name));
		el('poi-list').append(label);
	});
}

function gpsToggle() {
	if (gpsWatch !== null) {
		navigator.geolocation.clearWatch(gpsWatch);
		gpsWatch = null;
		gpsCentered = false;
		el('gps').classList.remove('active');
		map.getSource('location')?.setData({type:'FeatureCollection',features:[]});
		return;
	}
	if (!navigator.geolocation) {
		setStatus('GPS wird von diesem Browser nicht unterstützt.');
		return;
	}
	gpsCentered = false;
	gpsWatch = navigator.geolocation.watchPosition(position => {
		const coordinates = [position.coords.longitude, position.coords.latitude];
		map.getSource('location')?.setData({
			type: 'FeatureCollection',
			features: [{type: 'Feature', properties: {}, geometry: {type: 'Point', coordinates}}]
		});
		if (!gpsCentered) {
			map.easeTo({center: coordinates, zoom: Math.max(map.getZoom(), 13)});
			gpsCentered = true;
		}
		el('gps').classList.add('active');
	}, error => {
		setStatus(`GPS: ${error.message}`);
	}, {enableHighAccuracy: true, maximumAge: 10000});
}

async function main() {
	buildCategories();
	el('poi-toggle').addEventListener('click', () => togglePanel('poi-panel'));
	el('storage-toggle').addEventListener('click', () => togglePanel('storage-panel'));
	document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => el(button.dataset.close).classList.add('hidden')));
	el('map-file').addEventListener('change', event => importFile(event.target.files?.[0]));
	el('download').addEventListener('click', downloadArchive);
	el('remove').addEventListener('click', async () => {
		if (busy || !confirm('Gespeicherte Offline-Karte wirklich löschen?')) return;
		localStorage.removeItem(COMPLETE_KEY);
		localStorage.removeItem(DOWNLOADING_KEY);
		archive = null;
		await removeArchiveFile();
		el('storage-info').textContent = 'Keine Karte gespeichert.';
		el('remove').disabled = true;
		setStatus('Keine Offline-Karte gespeichert.');
		reloadStyle();
	});
	el('gps').addEventListener('click', gpsToggle);
	el('home').addEventListener('click', () => map.fitBounds(ROUTE_BOUNDS, {padding: 35, duration: 500}));

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'}).catch(error => setStatus(`Offline-Installation: ${error.message}`));
	}
	try {
		await loadArchive();
	} catch (error) {
		setStatus(`Noch keine gültige Karte gespeichert (${error.message}).`);
	}
	if (!archive) setStatus('Route geladen. Unter „Karte“ PMTiles-Paket importieren.');
	map = new maplibregl.Map({
		container: 'map', style: buildStyle(), center: [15.5, 47.2], zoom: 5.2,
		maxZoom: 16, attributionControl: false, dragRotate: false, touchPitch: false
	});
	map.on('load', () => {
		map.fitBounds(ROUTE_BOUNDS, {padding: 35, duration: 0});
		installPoiClicks();
	});
	map.on('error', event => {
		if (event.error) console.error('Kartenfehler:', event.error);
	});
}

main().catch(error => setStatus(`Start fehlgeschlagen: ${error.message}`));
