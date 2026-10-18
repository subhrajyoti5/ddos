/**
 * Shared radar configuration: allowed query values, endpoint map, metric
 * wording, polling defaults, error codes and deterministic demo data.
 *
 * This module is safe to import from both the server route handler and client
 * components. It must never contain secrets.
 */

export const CLOUDFLARE_RADAR_BASE_URL =
  "https://api.cloudflare.com/client/v4/radar";

export const RADAR_API_DOCS_URL =
  "https://developers.cloudflare.com/api/resources/radar/";

/**
 * Endpoint paths per layer. These are the only upstream paths the app can
 * ever call: the route handler validates `layer` against this map and never
 * forwards user-supplied paths or hosts.
 */
export const LAYER_ENDPOINTS = {
  l7: "/attacks/layer7/top/attacks",
  l3: "/attacks/layer3/top/attacks",
};

export const SUPPORTED_LAYERS = ["l7", "l3"];
export const SUPPORTED_RANGES = ["1d", "7d"];
export const DEFAULT_LAYER = "l7";
export const DEFAULT_RANGE = "1d";
export const DEFAULT_LIMIT = 10;
export const LIMIT_OPTIONS = [5, 10, 20];
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 20;

export const LAYER_DETAILS = {
  l7: {
    id: "l7",
    label: "Application (L7)",
    short: "L7",
    /**
     * Cloudflare Radar documents this endpoint's `value` as a percentage of
     * total Layer 7 attacks. We describe it as a share, never an absolute
     * count of attacks.
     */
    metricLabel: "Share of total mitigated Layer 7 attack requests",
    metricShortLabel: "Share of L7 attack requests",
    unconfirmedMetricLabel: "Reported value (unit not confirmed by API)",
    pairNoun: "origin\u2192target pairs",
    legend: "Reported origin \u2192 target corridor",
    hasTargets: true,
    selectionHint: "Corridor rows are country-level aggregates for the selected window.",
    disclosure:
      "Country-level aggregates, not individual attack events. Geographic attribution is approximate and varies by layer.",
  },
  l3: {
    id: "l3",
    label: "Network (L3)",
    short: "L3",
    metricLabel: "Share of total mitigated Layer 3 attacks",
    metricShortLabel: "Share of L3 attacks",
    unconfirmedMetricLabel: "Reported value (unit not confirmed by API)",
    pairNoun: "origin locations",
    legend: "Reported origin country centroid",
    /**
     * The current Layer 3 endpoint returns origin locations only
     * (no target country), so the adapter renders these rows as origin
     * markers instead of corridors.
     */
    hasTargets: false,
    selectionHint: "Layer 3 rows are origin locations; this endpoint does not return target countries.",
    disclosure:
      "Country-level aggregates, not individual attack events. Geographic attribution is approximate and varies by layer.",
    /** Cloudflare attributes L3 locations to the data-center location. */
    disclosureExtra:
      "Layer 3 note: Cloudflare attributes network-layer locations to the Cloudflare data-center location because source IPs can be spoofed. A country shown as an origin is not a verified physical attacker location.",
  },
};

export const RANGE_DETAILS = {
  "1d": { id: "1d", label: "Last 24 hours", short: "24h" },
  "7d": { id: "7d", label: "Last 7 days", short: "7d" },
};

/** Upstream request timeout. Must stay below the hosting request timeout. */
export const UPSTREAM_TIMEOUT_MS = 9000;

/**
 * Best-effort in-memory upstream cache. This is a courtesy to the upstream
 * API and a latency optimization only. Serverless deployments must not rely
 * on it: correctness never depends on cache hits.
 */
export const SERVER_CACHE_TTL_MS = 45 * 1000;

export const DEFAULT_REFRESH_INTERVAL_MS = 60 * 1000;
export const MIN_REFRESH_INTERVAL_MS = 30 * 1000;

/** Data older than this multiple of the poll interval is shown as stale. */
export const STALE_AFTER_INTERVALS = 2.5;

/** Arc palette. Cyan for L7, blue for L3, per the product design spec. */
export const ARC_STYLE = {
  l7: { base: "#06b6d4", dim: "#155e75" },
  l3: { base: "#3b82f6", dim: "#1e3a8a" },
  selected: "#a5f3fc",
};

export const ERROR_CODES = {
  INVALID_QUERY: "invalid_query",
  TOKEN_MISSING: "token_missing",
  UPSTREAM_AUTH: "upstream_auth",
  UPSTREAM_RATE_LIMIT: "upstream_rate_limit",
  UPSTREAM_TIMEOUT: "upstream_timeout",
  UPSTREAM_UNAVAILABLE: "upstream_unavailable",
  UPSTREAM_INVALID: "upstream_invalid",
  UNKNOWN: "unknown",
};

export const ERROR_STATUS = {
  [ERROR_CODES.INVALID_QUERY]: 400,
  [ERROR_CODES.TOKEN_MISSING]: 503,
  [ERROR_CODES.UPSTREAM_AUTH]: 502,
  [ERROR_CODES.UPSTREAM_RATE_LIMIT]: 429,
  [ERROR_CODES.UPSTREAM_TIMEOUT]: 504,
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: 502,
  [ERROR_CODES.UPSTREAM_INVALID]: 502,
  [ERROR_CODES.UNKNOWN]: 500,
};

/** User-safe error copy (PRD section 16). Never includes credential detail. */
export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_QUERY]: "Unsupported radar query. Check the layer, window, and limit values.",
  [ERROR_CODES.TOKEN_MISSING]: "Radar API token is not configured on the server.",
  [ERROR_CODES.UPSTREAM_AUTH]: "Radar API authorization failed.",
  [ERROR_CODES.UPSTREAM_RATE_LIMIT]: "Radar request limit reached. Showing last available data if possible.",
  [ERROR_CODES.UPSTREAM_TIMEOUT]: "Radar did not respond in time. Showing last available data if possible.",
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: "Radar is temporarily unavailable.",
  [ERROR_CODES.UPSTREAM_INVALID]: "Radar returned an unexpected response.",
  [ERROR_CODES.UNKNOWN]: "Radar data is temporarily unavailable.",
};

export function isSupportedLayer(layer) {
  return SUPPORTED_LAYERS.includes(layer);
}

export function isSupportedRange(range) {
  return SUPPORTED_RANGES.includes(range);
}

export function clampLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsed));
}

/**
 * Demo mode is opt-in, local-development only, and always labelled in the UI.
 * Sample rows are deterministic (no randomization) so rendering is stable.
 */
export const DEMO_CORRIDORS = [
  { rank: 1, origin: { name: "United States", code: "US", lat: 39.4433, lng: -99.4114 }, target: { name: "Canada", code: "CA", lat: 61.3952, lng: -99.4649 }, value: 8.42 },
  { rank: 2, origin: { name: "China", code: "CN", lat: 35.8617, lng: 104.1954 }, target: { name: "Germany", code: "DE", lat: 51.1657, lng: 10.4515 }, value: 6.15 },
  { rank: 3, origin: { name: "Brazil", code: "BR", lat: -14.235, lng: -51.9253 }, target: { name: "France", code: "FR", lat: 46.2276, lng: 2.2137 }, value: 4.88 },
  { rank: 4, origin: { name: "India", code: "IN", lat: 20.5937, lng: 78.9629 }, target: { name: "United Kingdom", code: "GB", lat: 55.3781, lng: -3.436 }, value: 4.02 },
  { rank: 5, origin: { name: "Russia", code: "RU", lat: 61.524, lng: 105.3188 }, target: { name: "Netherlands", code: "NL", lat: 52.1326, lng: 5.2913 }, value: 3.71 },
  { rank: 6, origin: { name: "Indonesia", code: "ID", lat: -0.7893, lng: 113.9213 }, target: { name: "Singapore", code: "SG", lat: 1.3521, lng: 103.8198 }, value: 2.94 },
  { rank: 7, origin: { name: "Nigeria", code: "NG", lat: 9.082, lng: 8.6753 }, target: { name: "South Africa", code: "ZA", lat: -30.5595, lng: 22.9375 }, value: 2.4 },
  { rank: 8, origin: { name: "Vietnam", code: "VN", lat: 14.0583, lng: 108.2772 }, target: { name: "Japan", code: "JP", lat: 36.2048, lng: 138.2529 }, value: 2.05 },
  { rank: 9, origin: { name: "Turkey", code: "TR", lat: 38.9637, lng: 35.2433 }, target: { name: "United Arab Emirates", code: "AE", lat: 23.4241, lng: 53.8478 }, value: 1.78 },
  { rank: 10, origin: { name: "Mexico", code: "MX", lat: 23.6345, lng: -102.5528 }, target: { name: "Spain", code: "ES", lat: 40.4637, lng: -3.7492 }, value: 1.52 },
];

export function buildDemoPayload({ layer = DEFAULT_LAYER, range = DEFAULT_RANGE } = {}) {
  const detail = LAYER_DETAILS[layer] ?? LAYER_DETAILS.l7;
  const hasTargets = detail.hasTargets;
  return {
    success: true,
    source: "cloudflare-radar",
    mode: "demo",
    layer,
    range,
    /**
     * Demo runs simulate no clock at all. `fetchedAt` stays null so neither
     * "last updated" nor "fetched at" claims can appear for sample data, and so
     * this function stays safe to call during a prerender (no Date.now()).
     */
    fetchedAt: null,
    upstreamLastUpdated: null,
    dateRange: null,
    metric: {
      label: detail.metricLabel,
      unit: "percent",
      normalization: "PERCENTAGE",
      sourceUnit: "requests",
      demo: true,
    },
    corridors: DEMO_CORRIDORS.map((row) => ({
      rank: row.rank,
      origin: { ...row.origin },
      target: hasTargets ? { ...row.target } : null,
      value: row.value,
      valueLabel: `${row.value.toFixed(2)}%`,
      mode: hasTargets ? "corridor" : "origin",
      hasArc: true,
    })),
    warnings: [
      {
        code: "demo_data",
        message: "DEMO DATA \u2014 NOT LIVE. Sample corridors for local development only.",
      },
    ],
  };
}
