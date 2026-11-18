import unittest

from tools.build_outdoor_pois import as_feature, build_query, parse_bbox, transform


class OutdoorPOITests(unittest.TestCase):
	def setUp(self):
		self.bbox = parse_bbox("8.43,47.89,8.91,48.15")

	def test_query_includes_outdoor_categories(self):
		query = build_query(self.bbox)
		self.assertIn('["natural"="cave_entrance"]', query)
		self.assertIn('["natural"="rock_overhang"]', query)
		self.assertIn('["leisure"="firepit"]', query)
		self.assertIn('out center;', query)

	def test_categories_and_duplicate_osm_id(self):
		data = {"elements": [
			{"type": "node", "id": 1, "lat": 48.0, "lon": 8.6, "tags": {"amenity": "shelter"}},
			{"type": "node", "id": 1, "lat": 48.0, "lon": 8.6, "tags": {"amenity": "shelter"}},
			{"type": "way", "id": 2, "center": {"lat": 48.02, "lon": 8.7}, "tags": {"historic": "castle", "ruins": "yes"}},
			{"type": "node", "id": 3, "lat": 48.02, "lon": 8.5, "tags": {"shelter_type": "rock_shelter"}},
			{"type": "node", "id": 4, "lat": 48.02, "lon": 8.5, "tags": {"amenity": "shelter", "shelter_type": "public_transport"}},
		]}
		result = transform(data, self.bbox)
		self.assertEqual(len(result["features"]), 3)
		self.assertEqual(result["metadata"]["counts"], {"castle_ruin": 1, "rock_shelter": 1, "shelter": 1})

	def test_no_invented_geometry(self):
		missing_center = {"type": "way", "id": 4, "tags": {"natural": "cave_entrance"}}
		self.assertIsNone(as_feature(missing_center, self.bbox))

	def test_outside_bounds_is_skipped(self):
		outside = {"type": "node", "id": 5, "lat": 49.0, "lon": 8.6, "tags": {"leisure": "firepit"}}
		self.assertIsNone(as_feature(outside, self.bbox))


if __name__ == "__main__":
	unittest.main()
