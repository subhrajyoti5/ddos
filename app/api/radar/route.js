/**
 * Server-side Radar proxy.
 *
 * The browser only ever talks to this same-origin route. The Cloudflare API
 * token is read from server environment variables and never leaves the server.
 *
 * Query contract (validated against allowlists, never forwarded blindly):
 *   GET /api/radar?layer=l7|l3&range=1d|7d&limit=1..20
 *
 * Caching: the response is always `no-store` for the browser because the
 * client owns its refresh cadence. A short in-memory cache politely shields
 * the upstream API; it is best-effort only and correctness never depends on
 * it (serverless instances may not share memory).
 *
 * Note (Next.js 16 Cache Components): no `dynamic` or `revalidate` route
 * segment config here. Reading `request.url`/`searchParams` is runtime data,
 * so this handler is served per request; the migration guide explicitly says
 * to remove `dynamic = "force-dynamic"` and `revalidate = 0` when
 * `cacheComponents` is enabled.
 */
import { createRadarClient, RadarUpstreamError } from "@/lib/cloudflare-radar";
import { normalizeTopAttacks } from "@/lib/normalize-radar";
import {
  buildDemoPayload,
  clampLimit,
  DEFAULT_LAYER,
  DEFAULT_RANGE,
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_STATUS,
  isSupportedLayer,
  isSupportedRange,
  SERVER_CACHE_TTL_MS,
} from "@/lib/radar-config";

const responseCache = new Map();

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body, { status = 200, cacheHit = null } = {}) {
  const headers = { ...NO_STORE_HEADERS };
  if (cacheHit !== null) headers["X-Radar-Cache"] = cacheHit ? "hit" : "miss";
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(code, { layer, range, status } = {}) {
  return json(
    {
      success: false,
      source: "cloudflare-radar",
      fetchedAt: new Date().toISOString(),
      layer: layer ?? null,
      range: range ?? null,
      error: {
        code,
        message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES[ERROR_CODES.UNKNOWN],
      },
    },
    { status: status ?? ERROR_STATUS[code] ?? 500 },
  );
}

function isDemoEnabled() {
  return (
    process.env.RADAR_DEMO_MODE === "true" ||
    process.env.NEXT_PUBLIC_RADAR_DEMO_MODE === "true"
  );
}

function readCache(key) {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return hit.payload;
}

function writeCache(key, payload) {
  // Bound the cache so a long-lived process cannot grow it without limit.
  if (responseCache.size > 50) responseCache.clear();
  responseCache.set(key, { payload, expiresAt: Date.now() + SERVER_CACHE_TTL_MS });
}

export async function GET(request) {
  const startedAt = Date.now();
  const searchParams = request.nextUrl?.searchParams ?? new URL(request.url).searchParams;

  const layer = searchParams.get("layer") ?? DEFAULT_LAYER;
  const range = searchParams.get("range") ?? DEFAULT_RANGE;
  const limit = clampLimit(searchParams.get("limit") ?? undefined);

  if (!isSupportedLayer(layer)) {
    return errorResponse(ERROR_CODES.INVALID_QUERY, { layer: null, range });
  }
  if (!isSupportedRange(range)) {
    return errorResponse(ERROR_CODES.INVALID_QUERY, { layer, range: null });
  }

  if (isDemoEnabled()) {
    return json(buildDemoPayload({ layer, range }));
  }

  const token = process.env.CLOUDFLARE_RADAR_API_TOKEN;
  const cacheKey = `${layer}|${range}|${limit}`;
  const cached = readCache(cacheKey);
  if (cached) {
    return json(cached, { cacheHit: true });
  }

  try {
    const client = createRadarClient({ token });
    const upstream = await client.requestTopAttacks({ layer, range, limit });
    const payload = normalizeTopAttacks({
      layer,
      range,
      payload: upstream,
      fetchedAt: new Date().toISOString(),
    });
    writeCache(cacheKey, payload);
    console.info(
      `[radar] ${layer} ${range} limit=${limit} upstream=200 elapsed=${Date.now() - startedAt}ms corridors=${payload.corridors.length}`,
    );
    return json(payload, { cacheHit: false });
  } catch (error) {
    if (error instanceof RadarUpstreamError) {
      const status = ERROR_STATUS[error.code] ?? 502;
      console.warn(
        `[radar] ${layer} ${range} limit=${limit} upstreamError=${error.code} upstreamStatus=${error.status ?? "n/a"} httpStatus=${status} elapsed=${Date.now() - startedAt}ms`,
      );
      const response = errorResponse(error.code, { layer, range, status });
      if (error.retryAfter) response.headers.set("Retry-After", error.retryAfter);
      return response;
    }
    console.error(
      `[radar] ${layer} ${range} limit=${limit} unexpectedError elapsed=${Date.now() - startedAt}ms`,
      error?.name ?? "Error",
    );
    return errorResponse(ERROR_CODES.UNKNOWN, { layer, range });
  }
}
