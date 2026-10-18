/**
 * Generates the two committed local datasets used by the app:
 *
 *   data/globe.json              Country polygon geometry for the globe's
 *                                dotted country layer (GeoJSON FeatureCollection).
 *   lib/country-centroids.json   ISO 3166-1 alpha-2 -> country centroid lookup.
 *
 * Run with `npm run generate:data` after changing a source dataset version.
 *
 * H3 validation (why some tiny polygon parts are removed)
 * -------------------------------------------------------
 * The globe renders countries as H3 hexagon fills. `three-globe` converts each
 * polygon with `h3.polygonToCells(coordinates, resolution, true)` inside its
 * render loop and throws on failure; a polygon too small to fill one hexagon at
 * the render resolution produces an uncaught `E_FAILED` error in the browser.
 * This script therefore validates every polygon part at the exact resolution the
 * globe uses (HEX_POLYGON_RESOLUTION below must match
 * components/ui/globe.jsx) and drops only the parts that cannot be converted.
 * Those parts are sub-cell specks that would render as nothing anyway.
 *
 * Sources and licenses
 * --------------------
 * - world-atlas (Natural Earth 1:110m Admin 0 countries), public domain data
 *   published by Natural Earth, converted to TopoJSON by Mike Bostock.
 *   Package license: ISC. Data license: public domain (Natural Earth).
 * - world-countries (mledoze/countries), ODbL-1.0 data, MIT-licensed package.
 *   Centroids are country-level geographical centroids, used only as visual
 *   anchors: they are NOT attack origins.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { polygonToCells } from "h3-js";
import { feature } from "topojson-client";
import countries from "world-countries";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Must match `hexPolygonResolution` in components/ui/globe.jsx. */
const HEX_POLYGON_RESOLUTION = 3;

const atlasPath = resolve(root, "node_modules/world-atlas/countries-110m.json");
const atlas = JSON.parse(readFileSync(atlasPath, "utf8"));
const collection = feature(atlas, atlas.objects.countries);

function polygonPartIsRenderable(part) {
  try {
    polygonToCells(part, HEX_POLYGON_RESOLUTION, true);
    return true;
  } catch {
    return false;
  }
}

function sanitizeGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return polygonPartIsRenderable(geometry.coordinates) ? geometry : null;
  }
  const parts = geometry.coordinates.filter(polygonPartIsRenderable);
  if (parts.length === 0) return null;
  return { type: "MultiPolygon", coordinates: parts };
}

const removedParts = [];
const features = [];

for (const f of collection.features) {
  if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) continue;

  const name = f.properties?.name ?? "Unknown";
  const partCount =
    f.geometry.type === "Polygon" ? 1 : f.geometry.coordinates.length;
  const geometry = sanitizeGeometry(f.geometry);
  const keptPartCount = geometry
    ? geometry.type === "Polygon"
      ? 1
      : geometry.coordinates.length
    : 0;

  if (keptPartCount < partCount) {
    removedParts.push(
      `${name} (${partCount - keptPartCount} of ${partCount} polygon part(s) below one H3 resolution-${HEX_POLYGON_RESOLUTION} cell)`,
    );
  }
  if (!geometry) {
    removedParts.push(`${name} (entire feature removed: no renderable parts)`);
    continue;
  }

  features.push({
    type: "Feature",
    properties: { name },
    geometry,
  });
}

const globe = {
  _meta: {
    source: "world-atlas@2 countries-110m (Natural Earth, public domain)",
    generated: new Date().toISOString(),
    h3Validation: {
      resolution: HEX_POLYGON_RESOLUTION,
      library: "h3-js polygonToCells",
      removedParts,
    },
  },
  type: "FeatureCollection",
  features,
};

mkdirSync(resolve(root, "data"), { recursive: true });
writeFileSync(resolve(root, "data/globe.json"), JSON.stringify(globe));

const centroids = {};
for (const country of countries) {
  if (!country.cca2 || !Array.isArray(country.latlng) || country.latlng.length !== 2) continue;
  const [lat, lng] = country.latlng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  centroids[country.cca2] = {
    name: country.name?.common ?? country.name?.official ?? country.cca2,
    lat,
    lng,
  };
}

const centroidFile = {
  _meta: {
    source: "world-countries (mledoze/countries) - ODbL-1.0 data, MIT package",
    generated: new Date().toISOString(),
  },
  centroids,
};

writeFileSync(resolve(root, "lib/country-centroids.json"), JSON.stringify(centroidFile));

console.log(`data/globe.json: ${features.length} country features`);
if (removedParts.length > 0) {
  console.log(`h3 validation removed ${removedParts.length} polygon part(s):`);
  for (const entry of removedParts) console.log(`  - ${entry}`);
} else {
  console.log("h3 validation: every polygon part is renderable");
}
console.log(`lib/country-centroids.json: ${Object.keys(centroids).length} country centroids`);
