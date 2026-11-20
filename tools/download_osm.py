#!/usr/bin/env python3
"""Download a regional OSM PBF with mirror and dated-file fallbacks."""

import argparse
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

REGIONS = {
	"tuebingen": "europe/germany/baden-wuerttemberg/tuebingen-regbez",
	"schwaben": "europe/germany/bayern/schwaben",
}
HOSTS = (
	"https://download.geofabrik.de/",
	"https://download-ext2.geofabrik.de/",
)
MIN_FILE_BYTES = 1_000_000


def list_dated_paths(region_path):
	"""Find dated source files published on the official region index."""
	page_url = urljoin(HOSTS[0], region_path + ".html")
	request = Request(page_url, headers={"User-Agent": "DanubeNavigator/1.0 (OSM offline map build)"})
	with urlopen(request, timeout=35) as response:
		html = response.read().decode("utf-8", errors="replace")
	prefix = region_path.rsplit("/", 1)[-1]
	pattern = rf"{re.escape(prefix)}-(\d{{6}})\.osm\.pbf"
	matches = sorted(set(re.findall(pattern, html)), reverse=True)
	valid = []
	for stamp in matches:
		try:
			date = datetime.strptime(stamp, "%y%m%d").replace(tzinfo=timezone.utc)
		except ValueError:
			continue
		if date <= datetime.now(timezone.utc):
			valid.append(f"{region_path}-{stamp}.osm.pbf")
	return valid[:8]


def try_download(url, output):
	"""Download to a temporary path and accept only a plausible PBF size."""
	tmp = output.with_suffix(output.suffix + ".part")
	tmp.unlink(missing_ok=True)
	result = subprocess.run(
		[
			"curl", "--fail", "--location", "--silent", "--show-error",
			"--connect-timeout", "20", "--max-time", "600",
			"--retry", "1", "--retry-delay", "2",
			"--user-agent", "DanubeNavigator/1.0 (OSM offline map build)",
			url, "--output", str(tmp),
		],
		check=False,
	)
	if result.returncode == 0 and tmp.exists() and tmp.stat().st_size >= MIN_FILE_BYTES:
		tmp.replace(output)
		print(f"Downloaded {output} ({output.stat().st_size:,} bytes) from {url}", flush=True)
		return True
	print(f"Source failed: {url} (curl={result.returncode})", flush=True)
	tmp.unlink(missing_ok=True)
	return False


def main():
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("--region", required=True, choices=REGIONS)
	parser.add_argument("--output", required=True, type=Path)
	args = parser.parse_args()

	region_path = REGIONS[args.region]
	args.output.parent.mkdir(parents=True, exist_ok=True)

	paths = [region_path + "-latest.osm.pbf"]
	try:
		paths.extend(list_dated_paths(region_path))
	except Exception as error:
		print(f"Could not inspect Geofabrik index: {error}", flush=True)

	# First try both mirrors for the 'latest' alias. If it redirects to a missing
	# dated object, try previously published dated files, newest first.
	for path in paths:
		for host in HOSTS:
			url = urljoin(host, path)
			print(f"Trying {url}", flush=True)
			if try_download(url, args.output):
				return 0

	print(f"ERROR: Could not download the {args.region} OSM extract from either mirror.", file=sys.stderr)
	return 1


if __name__ == "__main__":
	sys.exit(main())
