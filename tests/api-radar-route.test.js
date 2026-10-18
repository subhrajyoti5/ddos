import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/radar/route";
import { ERROR_CODES } from "@/lib/radar-config";
import l7Fixture from "./fixtures/l7-top-attacks.json";

function radarRequest(query) {
  return new Request(`http://localhost/api/radar?${new URLSearchParams(query).toString()}`);
}

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

describe("GET /api/radar", () => {
  it("rejects values outside the allowlists with invalid_query", async () => {
    const badLayer = await GET(radarRequest({ layer: "l4", range: "1d", limit: "10" }));
    expect(badLayer.status).toBe(400);
    expect((await readJson(badLayer)).error.code).toBe(ERROR_CODES.INVALID_QUERY);

    const badRange = await GET(radarRequest({ layer: "l7", range: "90d", limit: "10" }));
    expect(badRange.status).toBe(400);
    expect((await readJson(badRange)).error.code).toBe(ERROR_CODES.INVALID_QUERY);
  });

  it("never calls upstream when no token is configured", async () => {
    vi.stubEnv("RADAR_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_RADAR_DEMO_MODE", "false");
    vi.stubEnv("CLOUDFLARE_RADAR_API_TOKEN", "");
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const response = await GET(radarRequest({ layer: "l7", range: "1d", limit: "10" }));

    expect(response.status).toBe(503);
    expect((await readJson(response)).error.code).toBe(ERROR_CODES.TOKEN_MISSING);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("serves clearly labelled demo data without touching the network", async () => {
    vi.stubEnv("RADAR_DEMO_MODE", "true");
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const response = await GET(radarRequest({ layer: "l3", range: "7d", limit: "5" }));
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.mode).toBe("demo");
    expect(body.layer).toBe("l3");
    expect(body.corridors.length).toBeGreaterThan(0);
    for (const row of body.corridors) {
      expect(row.target).toBeNull();
    }
    expect(body.warnings.some((warning) => warning.code === "demo_data")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("normalizes live upstream data and caches it briefly in memory", async () => {
    vi.stubEnv("RADAR_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_RADAR_DEMO_MODE", "false");
    vi.stubEnv("CLOUDFLARE_RADAR_API_TOKEN", "test-token");
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(l7Fixture));
    globalThis.fetch = fetchSpy;

    const query = { layer: "l7", range: "7d", limit: "3" };
    const first = await GET(radarRequest(query));
    const firstBody = await readJson(first);

    expect(first.status).toBe(200);
    expect(first.headers.get("x-radar-cache")).toBe("miss");
    expect(firstBody.mode).toBe("live");
    expect(firstBody.corridors).toHaveLength(3);
    expect(firstBody.corridors[0].target.code).toBe("CA");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const second = await GET(radarRequest(query));
    const secondBody = await readJson(second);

    expect(second.headers.get("x-radar-cache")).toBe("hit");
    expect(secondBody.corridors).toHaveLength(3);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("maps upstream rate limiting to 429 with Retry-After intact", async () => {
    vi.stubEnv("RADAR_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_RADAR_DEMO_MODE", "false");
    vi.stubEnv("CLOUDFLARE_RADAR_API_TOKEN", "test-token");
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: false }, { status: 429, headers: { "retry-after": "45" } }));

    const response = await GET(radarRequest({ layer: "l3", range: "1d", limit: "20" }));
    const body = await readJson(response);

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
    expect(body.error.code).toBe(ERROR_CODES.UPSTREAM_RATE_LIMIT);
  });
});
