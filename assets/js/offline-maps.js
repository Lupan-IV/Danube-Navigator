import { offlineStyle, onlineStyle } from "./map-style.js";

const FILE_NAME = "danube-test.pmtiles";
const DOWNLOAD_URL = "./data/maps/donau-test.pmtiles";

const state = document.getElementById("offline-state");
const note = document.getElementById("offline-note");
const progress = document.getElementById("download-progress");
const downloadButton = document.getElementById("download-map");
const deleteButton = document.getElementById("delete-map");
const importButton = document.getElementById("import-map");
const fileInput = document.getElementById("map-file");

let map;
let protocol;
let currentArchive;
let busy = false;

function readableSize(bytes) {
	return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setBusy(value) {
	busy = value;
	downloadButton.disabled = value;
	importButton.disabled = value;
	deleteButton.disabled = value;
}

async function getRoot() {
	if (!navigator.storage?.getDirectory) {
		throw new Error("Dieser Browser unterstützt den lokalen Kartenspeicher (OPFS) nicht.");
	}
	return navigator.storage.getDirectory();
}

async function getSavedFile() {
	const root = await getRoot();
	try {
		return await (await root.getFileHandle(FILE_NAME)).getFile();
	} catch (error) {
		if (error.name === "NotFoundError") {
			return null;
		}
		throw error;
	}
}

async function showLocalMap(file) {
	const archive = new pmtiles.PMTiles(new pmtiles.FileSource(file));
	const header = await archive.getHeader();
	if (header.tileType !== pmtiles.TileType.Mvt) {
		throw new Error("Dieses Paket enthält keine kompatiblen Vektor-Kartendaten.");
	}
	const metadata = await archive.getMetadata();
	const layers = (metadata?.vector_layers || []).map(layer => layer.id);
	if (layers.length && !layers.includes("roads")) {
		throw new Error("Diese PMTiles-Datei ist keine kompatible Protomaps-Basiskarte (Layer 'roads' fehlt).");
	}
	protocol.add(archive);
	currentArchive = archive;
	map.setStyle(offlineStyle(file.name));
	state.textContent = `Offline bereit · ${readableSize(file.size)} · Zoom bis ${header.maxZoom}`;
	note.textContent = "Die Karte wird direkt vom Smartphone gelesen. Test: Flugmodus aktivieren und die App neu öffnen. Außerhalb des Kartenpakets bleibt der Hintergrund leer.";
	deleteButton.hidden = false;
}

async function refresh() {
	try {
		const file = await getSavedFile();
		if (file) {
			await showLocalMap(file);
		} else {
			state.textContent = "Noch kein Offline-Kartenpaket vorhanden";
			map.setStyle(onlineStyle());
			deleteButton.hidden = true;
		}
	} catch (error) {
		state.textContent = `Offline-Karte konnte nicht geöffnet werden: ${error.message}`;
		map.setStyle(onlineStyle());
	}
}

async function writeStream(stream, totalBytes = 0) {
	const root = await getRoot();
	const handle = await root.getFileHandle(FILE_NAME, { create: true });
	const writer = await handle.createWritable();
	let complete = false;
	let received = 0;
	progress.hidden = false;
	progress.value = 0;
	progress.removeAttribute("max");
	try {
		const reader = stream.getReader();
		while (true) {
			const { value, done } = await reader.read();
			if (done) {
				break;
			}
			await writer.write(value);
			received += value.byteLength;
			if (totalBytes > 0) {
				progress.max = 100;
				progress.value = Math.min(100, Math.round(100 * received / totalBytes));
			}
			state.textContent = totalBytes > 0
				? `Herunterladen: ${readableSize(received)} / ${readableSize(totalBytes)}`
				: `Herunterladen: ${readableSize(received)}`;
		}
		await writer.close();
		complete = true;
	} finally {
		if (!complete) {
			await writer.abort().catch(() => {});
			await root.removeEntry(FILE_NAME).catch(() => {});
		}
		progress.hidden = true;
	}
	return received;
}

async function importFile(file) {
	if (!file) {
		return;
	}
	if (!file.name.toLowerCase().endsWith(".pmtiles")) {
		throw new Error("Bitte eine .pmtiles-Datei auswählen.");
	}
	const archive = new pmtiles.PMTiles(new pmtiles.FileSource(file));
	await archive.getHeader();
	await writeStream(file.stream(), file.size);
	await refresh();
}

async function downloadMap() {
	if (busy) {
		return;
	}
	setBusy(true);
	try {
		await navigator.storage?.persist?.();
		state.textContent = "Suche Testkarte auf GitHub Pages …";
		const response = await fetch(DOWNLOAD_URL, { cache: "no-store" });
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error("Testkarte fehlt noch auf GitHub. Zuerst den Workflow 'Offline-Testkarte erstellen' unter Actions ausführen.");
			}
			throw new Error(`Karten-Download fehlgeschlagen (HTTP ${response.status}).`);
		}
		if (!response.body) {
			throw new Error("Der Browser unterstützt keinen gestreamten Download.");
		}
		const total = Number(response.headers.get("Content-Length")) || 0;
		await writeStream(response.body, total);
		await refresh();
	} catch (error) {
		state.textContent = `Fehler: ${error.message}`;
	} finally {
		setBusy(false);
	}
}

async function deleteMap() {
	if (!confirm("Offline-Karte von diesem Gerät löschen? Deine Tourdaten bleiben erhalten.")) {
		return;
	}
	setBusy(true);
	try {
		const root = await getRoot();
		await root.removeEntry(FILE_NAME);
		currentArchive = null;
		await refresh();
	} catch (error) {
		state.textContent = `Fehler: ${error.message}`;
	} finally {
		setBusy(false);
	}
}

export function initializeOfflineMaps(mapInstance) {
	map = mapInstance;
	protocol = new pmtiles.Protocol();
	maplibregl.addProtocol("pmtiles", protocol.tile);
	downloadButton.addEventListener("click", downloadMap);
	importButton.addEventListener("click", () => fileInput.click());
	fileInput.addEventListener("change", async () => {
		setBusy(true);
		try {
			await importFile(fileInput.files[0]);
		} catch (error) {
			state.textContent = `Import fehlgeschlagen: ${error.message}`;
		} finally {
			fileInput.value = "";
			setBusy(false);
		}
	});
	deleteButton.addEventListener("click", deleteMap);
	return refresh();
}
