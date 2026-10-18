/**
 * ISO 3166-1 alpha-2 -> country centroid lookup.
 *
 * Dataset: lib/country-centroids.json, generated from the `world-countries`
 * package (mledoze/countries, ODbL-1.0 data / MIT package) by
 * `npm run generate:data`. Regenerate when the source package is updated.
 *
 * Centroids are visual anchors on a globe. They are NOT attack origins and
 * must never be presented as precise locations. This module is intended for
 * server-side use by the radar adapters.
 */
import dataset from "./country-centroids.json";

const CENTROIDS = dataset.centroids ?? {};

export const COUNTRY_CENTROID_SOURCE = dataset._meta?.source ?? "world-countries";

const CODE_PATTERN = /^[A-Z0-9]{2}$/;

/** Returns `{ lat, lng, name }` or `null` when the code has no known centroid. */
export function getCountryCentroid(code) {
  if (typeof code !== "string") return null;
  const key = code.trim().toUpperCase();
  if (!CODE_PATTERN.test(key)) return null;
  const hit = CENTROIDS[key];
  if (!hit || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lng)) return null;
  return { lat: hit.lat, lng: hit.lng, name: hit.name ?? key };
}

export function getCountryName(code) {
  return getCountryCentroid(code)?.name ?? null;
}
