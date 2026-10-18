import { describe, expect, it, vi } from "vitest";
import { createRadarClient, RadarUpstreamError } from "@/lib/cloudflare-radar";
import { ERROR_CODES, UPSTREAM_TIMEOUT_MS } from "@/lib/radar-config";
import l7Fixture from "./fixtures/l7-top-attacks.json";

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("createRadarClient", () => {
  it("refuses to call upstream without a token and never sends an empty Authorization header", async () => {
    const fetchImpl = vi.fn();
    const client = createRadarClient({ fetchImpl, token: "   " });

    await expect(client.requestTopAttacks({ layer: "l7", range: "1d", limit: 10 })).rejects.toMatchObject({
      code: ERROR_CODES.TOKEN_MISSING,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("builds the documented URL with allowlisted path and query", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(l7Fixture));
    const client = createRadarClient({ fetchImpl, token: "test-token" });

    const payload = await client.requestTopAttacks({ layer: "l7", range: "7d", limit: 5 });

    expect(payload.result.top_0).toHaveLength(3);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.cloudflare.com/client/v4/radar/attacks/layer7/top/attacks?limit=5&dateRange=7d&format=json",
    );
    expect(options.headers.Authorization).toBe("Bearer test-token");
    expect(options.cache).toBe("no-store");
  });

  it.each([
    [401, ERROR_CODES.UPSTREAM_AUTH],
    [403, ERROR_CODES.UPSTREAM_AUTH],
    [429, ERROR_CODES.UPSTREAM_RATE_LIMIT],
    [500, ERROR_CODES.UPSTREAM_UNAVAILABLE],
  ])("maps HTTP %i to %s", async (status, code) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, { status }));
    const client = createRadarClient({ fetchImpl, token: "test-token" });

    await expect(client.requestTopAttacks({ layer: "l3", range: "1d", limit: 10 })).rejects.toMatchObject({
      code,
    });
  });

  it("exposes Retry-After on rate limits without leaking the token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({}, { status: 429, headers: { "retry-after": "30" } }),
    );
    const client = createRadarClient({ fetchImpl, token: "super-secret" });

    const error = await client
      .requestTopAttacks({ layer: "l7", range: "1d", limit: 10 })
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(RadarUpstreamError);
    expect(error.retryAfter).toBe("30");
    expect(JSON.stringify({ message: error.message, code: error.code })).not.toContain("super-secret");
  });

  it("rejects malformed JSON and failed success envelopes", async () => {
    const invalidJson = vi.fn().mockResolvedValue(
      new Response("<html>gateway error</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    const clientA = createRadarClient({ fetchImpl: invalidJson, token: "t" });
    await expect(clientA.requestTopAttacks({ layer: "l7", range: "1d", limit: 10 })).rejects.toMatchObject({
      code: ERROR_CODES.UPSTREAM_INVALID,
    });

    const failedEnvelope = vi.fn().mockResolvedValue(
      jsonResponse({ success: false, errors: [{ message: "bad" }], result: null }),
    );
    const clientB = createRadarClient({ fetchImpl: failedEnvelope, token: "t" });
    await expect(clientB.requestTopAttacks({ layer: "l7", range: "1d", limit: 10 })).rejects.toMatchObject({
      code: ERROR_CODES.UPSTREAM_INVALID,
    });
  });

  it("aborts a hung request after the configured timeout", async () => {
    const fetchImpl = vi.fn((url, options) => {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    const client = createRadarClient({ fetchImpl, token: "t", timeoutMs: 20 });

    await expect(client.requestTopAttacks({ layer: "l7", range: "1d", limit: 10 })).rejects.toMatchObject({
      code: ERROR_CODES.UPSTREAM_TIMEOUT,
    });
    expect(UPSTREAM_TIMEOUT_MS).toBeGreaterThan(20);
  });

  it("rejects an unsupported layer before any network call", async () => {
    const fetchImpl = vi.fn();
    const client = createRadarClient({ fetchImpl, token: "t" });

    await expect(client.requestTopAttacks({ layer: "l4", range: "1d", limit: 10 })).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_QUERY,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
