-- Simplified Danube Navigator basemap. Layer names match assets/js/map-style.js.
-- Generated only for the small Ulm/Neu-Ulm pilot region.

node_keys = { "place" }
way_keys = { "highway", "waterway", "natural", "landuse", "leisure", "building", "water" }

function node_function()
	local place = Find("place")
	local name = Find("name")
	if place ~= "" and name ~= "" then
		Layer("places", false)
		Attribute("name", name)
		Attribute("kind", place)
	end
end

function way_function()
	local highway = Find("highway")
	if highway ~= "" then
		Layer("roads", false)
		Attribute("kind_detail", highway)
		Attribute("name", Find("name"))
		Attribute("surface", Find("surface"))
	end

	local waterway = Find("waterway")
	if waterway ~= "" then
		Layer("water", false)
		Attribute("name", Find("name"))
		Attribute("kind", waterway)
	end

	local natural = Find("natural")
	local landuse = Find("landuse")
	local water = Find("water")
	if natural == "water" or water ~= "" or landuse == "reservoir" then
		Layer("water", true)
		Attribute("name", Find("name"))
	end

	local leisure = Find("leisure")
	local kind = landuse
	if kind == "" and (natural == "wood" or natural == "scrub" or natural == "grassland") then
		kind = natural
	end
	if kind == "" and (leisure == "park" or leisure == "garden" or leisure == "nature_reserve") then
		kind = leisure
	end
	if kind ~= "" then
		Layer("landuse", true)
		Attribute("kind", kind)
	end

	if Find("building") ~= "" then
		Layer("buildings", true)
	end
end
