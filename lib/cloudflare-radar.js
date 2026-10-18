/**
 * Server-only Cloudflare Radar client.
 *
 * - Reads the API token from the caller (the route handler) and never logs it.
 * - Applies a finite upstream timeout.
 * - Maps upstream failures to safe, coded errors.
 *
 * Only `app/api/radar/route.js` imports this module. Do not import it from
 * client components: it must never be part of the browser bundle.
 */
import {
  CLOUDFLARE_RADAR_BASE_URL,
  ERROR_CODES,
  ERROR_MESSAGES,
  LAYER_ENDPOINTS,
  UPSTREAM_TIMEOUT_MS,
} from "./radar-config";

export class RadarUpstreamError extends Error {
  constructor(code, { status = null, retryAfter = null, cause = null } = {}) {
    super(ERROR_MESSAGES[code] ?? ERROR_MESSAGES[ERROR_CODES.UNKNOWN]);
    this.name = "RadarUpstreamError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
    if (cause) this.cause = cause;
  }
}

/**
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl] injectable for tests
 * @param {string|undefined} [options.token]
 * @param {number} [options.timeoutMs]
 */
export function createRadarClient({
  fetchImpl = globalThis.fetch,
  token,
  timeoutMs = UPSTREAM_TIMEOUT_MS,
} = {}) {
  async function requestTopAttacks({ layer, range, limit }) {
    if (typeof token !== "string" || token.trim() === "") {
      throw new RadarUpstreamError(ERROR_CODES.TOKEN_MISSING);
    }

    const path = LAYER_ENDPOINTS[layer];
    if (!path) {
      throw new RadarUpstreamError(ERROR_CODES.INVALID_QUERY);
    }

    // The path comes from a fixed allowlist above; query values are already
    // validated by the route handler. No user input is used to build a host.
    const url = new URL(`${CLOUDFLARE_RADAR_BASE_URL}${path}`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("dateRange", range);
    url.searchParams.set("format", "json");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut =
        controller.signal.aborted ||
        error?.name === "AbortError" ||
        error?.name === "TimeoutError";
      throw new RadarUpstreamError(
        timedOut ? ERROR_CODES.UPSTREAM_TIMEOUT : ERROR_CODES.UPSTREAM_UNAVAILABLE,
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403) {
      throw new RadarUpstreamError(ERROR_CODES.UPSTREAM_AUTH, { status: response.status });
    }
    if (response.status === 429) {
      throw new RadarUpstreamError(ERROR_CODES.UPSTREAM_RATE_LIMIT, {
        status: response.status,
        retryAfter: response.headers?.get?.("retry-after") ?? null,
      });
    }
    if (!response.ok) {
      throw new RadarUpstreamError(ERROR_CODES.UPSTREAM_UNAVAILABLE, { status: response.status });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new RadarUpstreamError(ERROR_CODES.UPSTREAM_INVALID, { cause: error });
    }

    if (!payload || typeof payload !== "object" || payload.success !== true || !payload.result) {
      throw new RadarUpstreamError(ERROR_CODES.UPSTREAM_INVALID, { status: response.status });
    }

    return payload;
  }

  return { requestTopAttacks };
}
