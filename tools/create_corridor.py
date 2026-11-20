#!/usr/bin/env python3
"""Generate an approximately 50 km wide OSM data-selection corridor around a GPX track."""

import argparse
import json
import xml.etree.ElementTree as ET
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LineString, mapping
from shapely.ops import transform


def read_gpx(path):
	root = ET.parse(path).getroot()
	points = []
	for element in root.iter():
		if element.tag.rsplit("}", 1)[-1] not in {"trkpt", "rtept"}:
			continue
		lat = element.attrib.get("lat")
		lon = element.attrib.get("lon")
		if lat is None or lon is None:
			continue
		point = (float(lon), float(lat))
		if not points or points[-1] != point:
			points.append(point)
	if len(points) < 2:
		raise ValueError("GPX enthält keine ausreichenden Routenpunkte")
	return points


def create_corridor(points, radius_km=50):
	project = Transformer.from_crs("EPSG:4326", "EPSG:3035", always_xy=True).transform
	unproject = Transformer.from_crs("EPSG:3035", "EPSG:4326", always_xy=True).transform
	line = transform(project, LineString(points)).simplify(300, preserve_topology=False)
	buffer = line.buffer(radius_km * 1000, resolution=8).simplify(400, preserve_topology=True)
	return transform(unproject, buffer)


def main():
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("--input", default="data/route/reference-route.gpx")
	parser.add_argument("--output", default="data/route/corridor-50km.geojson")
	parser.add_argument("--radius-km", type=float, default=50)
	args = parser.parse_args()
	points = read_gpx(args.input)
	corridor = create_corridor(points, args.radius_km)
	result = {
		"type": "FeatureCollection",
		"features": [{
			"type": "Feature",
			"properties": {"radius_km": args.radius_km, "source": Path(args.input).name},
			"geometry": mapping(corridor)
		}]
	}
	Path(args.output).parent.mkdir(parents=True, exist_ok=True)
	Path(args.output).write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
	print(f"Routenpunkte: {len(points)}; Korridor gespeichert: {args.output}")


if __name__ == "__main__":
	main()
