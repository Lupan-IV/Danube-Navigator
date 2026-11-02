const EARTH_RADIUS_KM = 6371.0088;

function radians(degrees) {
	return degrees * Math.PI / 180;
}

export function distanceKm(a, b) {
	const dLat = radians(b.lat - a.lat);
	const dLon = radians(b.lon - a.lon);
	const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function parseGpx(xmlText) {
	const document = new DOMParser().parseFromString(xmlText, "application/xml");
	if (document.querySelector("parsererror")) {
		throw new Error("Die GPX-Datei ist ungültig.");
	}
	const track = document.querySelector("trk");
	if (!track) {
		throw new Error("Kein GPX-Track gefunden.");
	}
	const points = Array.from(track.getElementsByTagName("trkpt"), node => ({
		lat: Number(node.getAttribute("lat")),
		lon: Number(node.getAttribute("lon"))
	})).filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon));
	if (points.length < 2) {
		throw new Error("Der Track enthält zu wenige Punkte.");
	}
	const cumulativeKm = [0];
	for (let i = 1; i < points.length; i++) {
		cumulativeKm.push(cumulativeKm[i - 1] + distanceKm(points[i - 1], points[i]));
	}
	return { points, cumulativeKm, totalKm: cumulativeKm[cumulativeKm.length - 1] };
}

// Approximate local segment projection, sufficient for nearest-route display.
export function closestRoutePosition(route, position) {
	let nearest = { distanceKm: Infinity, progressKm: 0 };
	const latScale = 111.195;
	const lonScale = latScale * Math.cos(radians(position.lat));
	for (let i = 1; i < route.points.length; i++) {
		const a = route.points[i - 1];
		const b = route.points[i];
		const ax = (a.lon - position.lon) * lonScale;
		const ay = (a.lat - position.lat) * latScale;
		const bx = (b.lon - position.lon) * lonScale;
		const by = (b.lat - position.lat) * latScale;
		const dx = bx - ax;
		const dy = by - ay;
		const denominator = dx * dx + dy * dy;
		const fraction = denominator > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator)) : 0;
		const distance = Math.hypot(ax + fraction * dx, ay + fraction * dy);
		if (distance < nearest.distanceKm) {
			nearest = {
				distanceKm: distance,
				progressKm: route.cumulativeKm[i - 1] + fraction * (route.cumulativeKm[i] - route.cumulativeKm[i - 1])
			};
		}
	}
	return nearest;
}
