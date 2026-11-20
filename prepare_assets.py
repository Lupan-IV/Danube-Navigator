#!/usr/bin/env python3
"""One-time download of pinned JS libraries plus required local map labels/icons."""

from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
import tempfile
import shutil
import time
import zipfile

ROOT = Path(__file__).resolve().parent
FILES = {
	'vendor/maplibre-gl.js': 'https://unpkg.com/maplibre-gl@5.0.1/dist/maplibre-gl.js',
	'vendor/maplibre-gl.css': 'https://unpkg.com/maplibre-gl@5.0.1/dist/maplibre-gl.css',
	'vendor/pmtiles.js': 'https://unpkg.com/pmtiles@4.2.1/dist/pmtiles.js',
	'vendor/basemaps.js': 'https://unpkg.com/@protomaps/basemaps@5.7.2/dist/basemaps.js',
}
FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic']
RANGES = ['0-255','256-511','512-767','768-1023','1024-1279','1280-1535','7680-7935','8192-8447']
SPRITES = ['light.json','light.png','light@2x.json','light@2x.png']
REPO = 'https://codeload.github.com/protomaps/basemaps-assets/zip/refs/heads/main'


def fetch(url, destination):
	destination.parent.mkdir(parents=True, exist_ok=True)
	if destination.exists() and destination.stat().st_size:
		print('Vorhanden:', destination.relative_to(ROOT))
		return
	for attempt in range(3):
		try:
			print('Lade:', url)
			with urlopen(Request(url, headers={'User-Agent': 'DonauOffline/1.0'}), timeout=100) as response:
				with destination.open('wb') as output:
					shutil.copyfileobj(response, output)
			if destination.stat().st_size < 10:
				raise ValueError('Leere oder fehlerhafte Antwort')
			return
		except (HTTPError, URLError, OSError, ValueError) as error:
			destination.unlink(missing_ok=True)
			if attempt == 2:
				raise RuntimeError(f'Asset nicht abrufbar: {url}: {error}') from error
			time.sleep(2 + attempt * 2)


def main():
	for path, url in FILES.items():
		fetch(url, ROOT / path)
	with tempfile.TemporaryDirectory() as temporary:
		archive_path = Path(temporary) / 'basemaps-assets.zip'
		fetch(REPO, archive_path)
		with zipfile.ZipFile(archive_path) as archive:
			for font in FONTS:
				for glyph_range in RANGES:
					rel = f'fonts/{font}/{glyph_range}.pbf'
					members = [name for name in archive.namelist() if name.endswith('/' + rel)]
					if not members:
						raise RuntimeError(f'Glyph fehlt in basemaps-assets: {rel}')
					output = ROOT / 'assets' / rel
					output.parent.mkdir(parents=True, exist_ok=True)
					with archive.open(members[0]) as source, output.open('wb') as target:
						shutil.copyfileobj(source, target)
			for filename in SPRITES:
				rel = f'sprites/v4/{filename}'
				members = [name for name in archive.namelist() if name.endswith('/' + rel)]
				if not members:
					raise RuntimeError(f'Sprite fehlt in basemaps-assets: {rel}')
				output = ROOT / 'assets' / rel
				output.parent.mkdir(parents=True, exist_ok=True)
				with archive.open(members[0]) as source, output.open('wb') as target:
					shutil.copyfileobj(source, target)
			for name in ['fonts/OFL.txt','sprites/LICENSE']:
				members = [member for member in archive.namelist() if member.endswith('/' + name)]
				if members:
					output = ROOT / 'assets' / name
					output.parent.mkdir(parents=True, exist_ok=True)
					with archive.open(members[0]) as source, output.open('wb') as target:
						shutil.copyfileobj(source, target)
	print('Fertig! Alle JS-Bibliotheken und vorbereiteten Offline-Kartenbeschriftungen sind vorhanden.')


if __name__ == '__main__':
	main()
