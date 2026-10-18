/**
 * Endpoint-specific adapters that turn Cloudflare Radar responses into the
 * small, stable payload the dashboard consumes.
 *
 * Verified against the live Cloudflare Radar API reference (2026-10-18):
 *
 *   Layer 7  /radar/attacks/layer7/top/attacks
 *     result.top_0[] = { originCountryName, originCountryAlpha2,
 *                        targetCountryName, targetCountryAlpha2, value }
 *     value is a percentage (string) of total Layer 7 attacks.
 *     There is no `rank` field: rank is derived from the returned order.
 *
 *   Layer 3  /radar/attacks/layer3/top/attacks
 *     result.top_0[] = { originCountryName, originCountryAlpha2, value }
 *     value is a percentage (string) of total Layer 3 attacks.
 *     The current schema returns NO target country, so Layer 3 rows are
 *     origin-location shares. The adapter keeps them as origin markers and
 *     never invents a target.
 *
 * Both endpoints return meta.dateRange (array), meta.lastUpdated,
 * meta.normalization and meta.units [{ name, value }].
 */
import { LAYER_DETAILS } from "./radar-config";
import { getCountryCentroid } from "./country-centroids";

const ALPHA_CODE = /^[A-Z0-9]{2}$/;

function topLevelKey(result) {
  if (!result || typeof result !== "object") return null;
  return Object.keys(result).find((key) => /^top_\d+$/.test(key)) ?? null;
}

function toFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return ALPHA_CODE.test(code) ? code : null;
}

function normalizeName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name === "" ? null : name;
}

/** "United States (US)" style label, with graceful fallbacks. */
function fallbackName(code) {
  return code ?? "Unknown location";
}

function resolveLocation({ code, name }) {
  const normalizedCode = normalizeCode(code);
  const centroid = normalizedCode ? getCountryCentroid(normalizedCode) : null;
  return {
    code: normalizedCode,
    name: normalizeName(name) ?? centroid?.name ?? fallbackName(normalizedCode),
    lat: centroid ? centroid.lat : null,
    lng: centroid ? centroid.lng : null,
    resolved: Boolean(centroid),
  };
}

function pickDateRange(meta) {
  const raw = meta?.dateRange;
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first || typeof first !== "object") return null;
  const startTime = typeof first.startTime === "string" ? first.startTime : null;
  const endTime = typeof first.endTime === "string" ? first.endTime : null;
  if (!startTime && !endTime) return null;
  return { startTime, endTime };
}

function pickSourceUnit(meta) {
  const units = Array.isArray(meta?.units) ? meta.units : null;
  const first = units?.find((unit) => unit && typeof unit.value === "string");
  return first?.value ?? null;
}

function buildMetric(detail, normalization, sourceUnit, warnings) {
  if (normalization === "PERCENTAGE") {
    return {
      label: detail.metricLabel,
      unit: "percent",
      normalization,
      sourceUnit,
      format(value) {
        return `${value.toFixed(2)}%`;
      },
    };
  }
  if (normalization === "MIN_MAX" || normalization === "MIN0_MAX") {
    warnings.push({
      code: "normalization_relative_index",
      message:
        "Upstream returned a relative index (min-max normalization) instead of a percentage. Values are not shares of attacks.",
    });
    return {
      label: `${detail.metricLabel} (relative index, not a percentage)`,
      unit: "index",
      normalization,
      sourceUnit,
      format(value) {
        return value.toFixed(1);
      },
    };
  }
  if (normalization && normalization !== "PERCENTAGE") {
    warnings.push({
      code: "normalization_unconfirmed",
      message: `Upstream normalization "${normalization}" is not documented in this app; values are shown without a unit.`,
    });
  }
  return {
    label: detail.unconfirmedMetricLabel,
    unit: null,
    normalization: normalization ?? null,
    sourceUnit,
    format(value) {
      return value.toFixed(2);
    },
  };
}

/**
 * @param {object} input
 * @param {"l7"|"l3"} input.layer
 * @param {string} input.range
 * @param {object} input.payload raw Cloudflare Radar JSON (untrusted)
 * @param {string} [input.fetchedAt] ISO timestamp of this fetch
 */
export function normalizeTopAttacks({ layer, range, payload, fetchedAt = new Date().toISOString() }) {
  const detail = LAYER_DETAILS[layer];
  if (!detail) throw new Error(`Unsupported layer: ${layer}`);

  const result = payload?.result;
  const meta = result?.meta ?? {};
  const normalization = typeof meta.normalization === "string" ? meta.normalization : null;
  const warnings = [];

  const rowsKey = topLevelKey(result);
  const rows = rowsKey ? result[rowsKey] : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const metric = buildMetric(detail, normalization, pickSourceUnit(meta), warnings);

  let unresolvedCount = 0;
  const corridors = [];

  safeRows.forEach((row, index) => {
    if (!row || typeof row !== "object") return;

    const origin = resolveLocation({
      code: row.originCountryAlpha2,
      name: row.originCountryName,
    });
    const targetSource = {
      code: row.targetCountryAlpha2,
      name: row.targetCountryName,
    };
    const hasTargetFields =
      normalizeCode(targetSource.code) !== null || normalizeName(targetSource.name) !== null;
    const target = hasTargetFields ? resolveLocation(targetSource) : null;

    const value = toFiniteNumber(row.value);
    const rankValue = toFiniteNumber(row.rank);
    const rank = Number.isInteger(rankValue) && rankValue > 0 ? rankValue : index + 1;

    /**
     * Arc rules (PRD FR-02 / section 11):
     * - Location corridor rows: arc only when BOTH centroids resolve.
     * - Origin-only rows (current Layer 3 schema): marker at the origin
     *   centroid (start === end), never a guessed target.
     * - Unknown centroid: keep the row, omit the arc.
     */
    const hasArc = target
      ? origin.resolved && target.resolved
      : detail.hasTargets === false && origin.resolved;

    if (!origin.resolved || (target && !target.resolved)) unresolvedCount += 1;

    corridors.push({
      rank,
      origin: { name: origin.name, code: origin.code, lat: origin.lat, lng: origin.lng },
      target: target
        ? { name: target.name, code: target.code, lat: target.lat, lng: target.lng }
        : null,
      value,
      valueLabel: value === null ? "n/a" : metric.format(value),
      mode: target ? "corridor" : "origin",
      hasArc,
    });
  });

  corridors.sort((a, b) => a.rank - b.rank);

  if (detail.hasTargets === false && corridors.length > 0) {
    warnings.push({
      code: "origin_only_endpoint",
      message: detail.selectionHint,
    });
  }
  if (unresolvedCount > 0) {
    warnings.push({
      code: "missing_centroid",
      message: `${unresolvedCount} row(s) have no known country centroid and are omitted from the globe. The rows remain in the list.`,
    });
  }

  return {
    success: true,
    source: "cloudflare-radar",
    mode: "live",
    layer,
    range,
    fetchedAt,
    upstreamLastUpdated: typeof meta.lastUpdated === "string" ? meta.lastUpdated : null,
    dateRange: pickDateRange(meta),
    metric: {
      label: metric.label,
      unit: metric.unit,
      normalization: metric.normalization,
      sourceUnit: metric.sourceUnit,
    },
    corridors,
    warnings,
  };
}
