#!/usr/bin/env python3
"""Export selected OSM outdoor features as an offline GeoJSON layer."""

import argparse
import json
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OVERPASS_URLS = (
	"https://overpass.private.coffee/api/interpreter",
	"https://overpass-api.de/api/interpreter",
)

CATEGORY_LABELS = {
	"water": "Trinkwasser",
	"shop": "Supermärkte",
	"bakery": "Bäckereien",
	"food": "Essen & Cafés",
	"camp": "Campingplätze",
	"lodging": "Unterkünfte",
	"bike": "Fahrradservice",
	"toilets": "Toiletten",
	"transport": "Bahnhof / Fähre",
	"medical": "Apotheke / Arzt",
	"shelter": "Schutzhütten",
	"wilderness_hut": "Wildnishütten",
	"cave": "Höhlen",
	"rock_shelter": "Felsüberhänge",
	"firepit": "Feuerstellen",
	"picnic": "Picknickplätze",
	"castle_ruin": "Burgruinen",
	"ruin": "Sonstige Ruinen",
	"scenic": "Sehenswertes",
	"beach": "Badestellen",
}


def parse_bbox(value):
	try:
		west, south, east, north = (float(item) for item in value.split(","))
	except (ValueError, TypeError) as error:
		raise ValueError("BBox muss west,sued,ost,nord enthalten") from error
	if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
		raise ValueError("Ungueltige Bounding Box")
	return west, south, east, north


def build_query(bbox):
	west, south, east, north = bbox
	area = f"({south},{west},{north},{east})"
	selectors = [
		'["amenity"="shelter"]',
		'["tourism"="wilderness_hut"]',
		'["natural"="cave_entrance"]',
		'["natural"="rock_overhang"]',
		'["shelter_type"="rock_shelter"]',
		'["leisure"="firepit"]',
		'["tourism"="picnic_site"]',
		'["historic"="castle"]["ruins"="yes"]',
		'["historic"="castle"]["castle_type"~"^(ruins|ruin)$"]',
		'["historic"="ruins"]',
		'["ruins"="castle"]',
	]
	lines = "\n".join(f"  nwr{selector}{area};" for selector in selectors)
	return f"[out:json][timeout:90];\n(\n{lines}\n);\nout center;\n"


def load_overpass(query):
	payload = urlencode({"data": query}).encode("utf-8")
	errors = []

	for url in OVERPASS_URLS:
		for attempt in range(2):
			print(f"Overpass: {url} (attempt {attempt + 1}/2)", flush=True)
			request = Request(
				url,
				data=payload,
				headers={
					"User-Agent": "DanubeNavigator-OutdoorPOI/1.1 (GitHub Actions; personal offline map)",
					"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
					"Accept": "application/json",
				},
				method="POST",
			)
			try:
				with urlopen(request, timeout=85) as response:
					data = json.load(response)
				if not isinstance(data, dict) or not isinstance(data.get("elements"), list):
					raise ValueError("Invalid Overpass result: missing elements list")
				print(f"Overpass responded: {len(data['elements'])} OSM elements", flush=True)
				return data
			except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as error:
				errors.append(f"{url}: {error}")
				print(f"Overpass failed: {type(error).__name__}: {error}", flush=True)
				if isinstance(error, HTTPError) and error.code not in (429, 500, 502, 503, 504):
					break
				if attempt == 0:
					time.sleep(5)

	raise RuntimeError("All Overpass endpoints failed; " + " | ".join(errors))


def categorize(tags):
	if tags.get("natural") == "cave_entrance":
		return "cave"
	if tags.get("natural") == "rock_overhang" or tags.get("shelter_type") == "rock_shelter":
		return "rock_shelter"
	if tags.get("amenity") == "shelter":
		if tags.get("shelter_type") in {"public_transport", "field_shelter", "bomb_shelter"}:
			return None
		return "shelter"
	if tags.get("tourism") == "wilderness_hut":
		return "wilderness_hut"
	if tags.get("leisure") == "firepit":
		return "firepit"
	if tags.get("tourism") == "picnic_site":
		return "picnic"
	if tags.get("historic") == "castle" and (
		tags.get("ruins") == "yes" or tags.get("castle_type") in {"ruins", "ruin"}
	):
		return "castle_ruin"
	if tags.get("historic") == "ruins" or tags.get("ruins") == "castle":
		return "castle_ruin" if tags.get("ruins") == "castle" else "ruin"
	if tags.get("amenity") == "drinking_water":
		return "water"
	if tags.get("shop") == "supermarket":
		return "shop"
	if tags.get("shop") == "bakery":
		return "bakery"
	if tags.get("amenity") in {"restaurant", "cafe", "fast_food"}:
		return "food"
	if tags.get("tourism") == "camp_site":
		return "camp"
	if tags.get("tourism") in {"hotel", "hostel", "guest_house", "motel", "alpine_hut"}:
		return "lodging"
	if tags.get("shop") == "bicycle" or tags.get("amenity") == "bicycle_repair_station":
		return "bike"
	if tags.get("amenity") == "toilets":
		return "toilets"
	if tags.get("railway") == "station" or tags.get("amenity") == "ferry_terminal":
		return "transport"
	if tags.get("amenity") in {"pharmacy", "hospital", "clinic", "doctors"}:
		return "medical"
	if tags.get("tourism") in {"attraction", "viewpoint"}:
		return "scenic"
	if tags.get("natural") == "beach" or tags.get("leisure") == "bathing_place":
		return "beach"
	return None

def as_feature(element, bbox):
	osm_type = element.get("type")
	osm_id = element.get("id")
	if osm_type not in {"node", "way", "relation"} or not isinstance(osm_id, int):
		return None
	tags = element.get("tags") or {}
	category = categorize(tags)
	if not category:
		return None
	if osm_type == "node":
		lat, lon = element.get("lat"), element.get("lon")
	else:
		center = element.get("center") or {}
		lat, lon = center.get("lat"), center.get("lon")
	if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
		return None
	west, south, east, north = bbox
	if not (west <= lon <= east and south <= lat <= north):
		return None
	properties = {
		"category": category,
		"label": CATEGORY_LABELS[category],
		"name": (tags.get("name:de") or tags.get("name") or CATEGORY_LABELS[category]),
		"osm_type": osm_type,
		"osm_id": osm_id,
	}
	for key in ("description", "access", "shelter_type", "fireplace", "drinking_water", "opening_hours", "website", "note"):
		if tags.get(key):
			properties[key] = tags[key]
	return {
		"type": "Feature",
		"id": f"osm:{osm_type}:{osm_id}",
		"geometry": {"type": "Point", "coordinates": [lon, lat]},
		"properties": properties,
	}


def transform(data, bbox):
	if not isinstance(data.get("elements"), list):
		raise ValueError("Overpass lieferte keine gueltige Elementliste")
	features = {}
	for element in data["elements"]:
		feature = as_feature(element, bbox)
		if feature:
			features[feature["id"]] = feature
	ordered = sorted(features.values(), key=lambda feature: feature["id"])
	counts = dict(sorted(Counter(item["properties"]["category"] for item in ordered).items()))
	return {
		"type": "FeatureCollection",
		"metadata": {
			"source": "OpenStreetMap via Overpass API",
			"license": "ODbL 1.0",
			"generated_utc": datetime.now(timezone.utc).isoformat(),
			"bbox": list(bbox),
			"counts": counts,
		},
		"features": ordered,
	}


def geometry_center(geometry):
	"""Return a practical marker location for OSM geometries."""
	if not isinstance(geometry, dict):
		return None
	coordinates = geometry.get("coordinates")
	geometry_type = geometry.get("type")
	if geometry_type == "Point":
		if (isinstance(coordinates, list) and len(coordinates) >= 2
			and all(isinstance(value, (int, float)) for value in coordinates[:2])):
			return coordinates[0], coordinates[1]
		return None
	if geometry_type not in {"LineString", "MultiLineString", "Polygon", "MultiPolygon"}:
		return None
	positions = []
	def walk(value):
		if not isinstance(value, list):
			return
		if len(value) >= 2 and all(isinstance(v, (int, float)) for v in value[:2]):
			positions.append((value[0], value[1]))
			return
		for child in value:
			walk(child)
	walk(coordinates)
	if not positions:
		return None
	# Bounding-box center is stable for irregular or multipolygon areas.
	return ((min(pos[0] for pos in positions) + max(pos[0] for pos in positions)) / 2,
		(min(pos[1] for pos in positions) + max(pos[1] for pos in positions)) / 2)


def transform_geojson(data, bbox):
	"""Convert Osmium GeoJSON features to the app's existing offline POI schema."""
	if not isinstance(data, dict) or not isinstance(data.get("features"), list):
		raise ValueError("Ungueltiger GeoJSON-Export: features fehlen")
	converted = []
	for raw_feature in data["features"]:
		if not isinstance(raw_feature, dict):
			continue
		properties = raw_feature.get("properties") or {}
		if not isinstance(properties, dict):
			continue
		osm_type = properties.get("@type")
		osm_id = properties.get("@id")
		if osm_type not in {"node", "way", "relation"}:
			continue
		try:
			osm_id = int(osm_id)
		except (TypeError, ValueError):
			continue
		center = geometry_center(raw_feature.get("geometry"))
		if center is None:
			continue
		lon, lat = center
		tags = {key: value for key, value in properties.items()
			if not key.startswith("@") and isinstance(value, str)}
		converted.append({"type": osm_type, "id": osm_id, "lat": lat,
			"lon": lon, "center": {"lat": lat, "lon": lon}, "tags": tags})
	result = transform({"elements": converted}, bbox)
	result["metadata"]["source"] = "OpenStreetMap via Geofabrik OSM extracts and Osmium"
	return result


def main():
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("--bbox", default="9.82,48.27,10.16,48.53", help="west,south,east,north")
	parser.add_argument("--output", default="data/pois/outdoor-test.geojson")
	parser.add_argument("--input", help="Optionale vorhandene Overpass-JSON-Datei für lokale Tests")
	parser.add_argument("--input-geojson", help="Osmium GeoJSON-Export aus lokalen OSM-Rohdaten")
	args = parser.parse_args()
	bbox = parse_bbox(args.bbox)
	if args.input_geojson:
		data = json.loads(Path(args.input_geojson).read_text(encoding="utf-8"))
		result = transform_geojson(data, bbox)
	else:
		if args.input:
			data = json.loads(Path(args.input).read_text(encoding="utf-8"))
		else:
			print("Lade OSM-Daten aus Overpass …", flush=True)
			data = load_overpass(build_query(bbox))
		result = transform(data, bbox)
	if not result["features"]:
		raise RuntimeError("Keine POIs gefunden; es wird keine leere Datei veröffentlicht. OSM-Abfrage prüfen.")
	output = Path(args.output)
	output.parent.mkdir(parents=True, exist_ok=True)
	output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
	print(f"POIs gespeichert: {len(result['features'])} ({output}, {output.stat().st_size} Bytes)")
	for category, count in result["metadata"]["counts"].items():
		print(f"  {CATEGORY_LABELS[category]}: {count}")


if __name__ == "__main__":
	try:
		main()
	except (RuntimeError, ValueError) as error:
		print(f"Fehler: {error}", file=sys.stderr)
		sys.exit(1)
