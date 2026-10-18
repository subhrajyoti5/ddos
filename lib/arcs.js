/**
 * Deterministic corridor -> globe arc conversion (PRD FR-02).
 *
 * The same function runs on the client for the API payload and for demo data,
 * so arcs never change between renders unless the data or selection changes.
 * Arc width/opacity communicated through color is a visual emphasis derived
 * from rank and reported share; it is not a packets-per-second measure.
 */
import { ARC_STYLE } from "./radar-config";

const MIN_ALT = 0.18;
const MAX_ALT = 0.42;

/**
 * @param {Array<object>} corridors normalized corridor rows
 * @param {object} [options]
 * @param {"l7"|"l3"} [options.layer]
 * @param {number|null} [options.selectedRank]
 * @returns {Array<{order:number,startLat:number,startLng:number,endLat:number,endLng:number,arcAlt:number,color:string}>}
 */
export function buildArcs(corridors, { layer = "l7", selectedRank = null } = {}) {
  if (!Array.isArray(corridors)) return [];

  const palette = ARC_STYLE[layer] ?? ARC_STYLE.l7;
  const plottable = corridors.filter((corridor) => corridor?.hasArc);
  if (plottable.length === 0) return [];

  const values = plottable
    .map((corridor) => corridor.value)
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  const maxValue = values.length > 0 ? Math.max(...values) : null;
  const maxRank = Math.max(...plottable.map((corridor) => corridor.rank ?? 1), 1);

  return plottable.map((corridor) => {
    let fraction;
    if (maxValue && maxValue > 0 && typeof corridor.value === "number") {
      fraction = corridor.value / maxValue;
    } else {
      fraction = 1 - (Math.min(corridor.rank ?? maxRank, maxRank) - 1) / maxRank;
    }
    fraction = Math.min(1, Math.max(0, fraction));

    const selected = selectedRank !== null && corridor.rank === selectedRank;
    const dimmed = selectedRank !== null && !selected;

    const origin = corridor.origin ?? {};
    const target = corridor.target ?? corridor.origin;
    return {
      order: corridor.rank ?? 1,
      startLat: origin.lat,
      startLng: origin.lng,
      // Origin-only rows (current Layer 3 schema) collapse to a marker:
      // the start and end coincide, so no target location is implied.
      endLat: target?.lat ?? origin.lat,
      endLng: target?.lng ?? origin.lng,
      arcAlt: (MIN_ALT + (MAX_ALT - MIN_ALT) * fraction).toFixed(3) * 1,
      color: selected ? ARC_STYLE.selected : dimmed ? palette.dim : palette.base,
    };
  });
}
