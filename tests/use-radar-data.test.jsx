import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { RADAR_STATUS, useRadarData } from "@/hooks/use-radar-data";

function livePayload(overrides = {}) {
  return {
    success: true,
    source: "cloudflare-radar",
    mode: "live",
    layer: "l7",
    range: "1d",
    fetchedAt: "2026-10-18T00:10:00Z",
    upstreamLastUpdated: "2026-10-18T00:04:00Z",
    dateRange: { startTime: "2026-10-17T00:00:00Z", endTime: "2026-10-18T00:00:00Z" },
    metric: { label: "Share", unit: "percent", normalization: "PERCENTAGE", sourceUnit: "requests" },
    corridors: [
      {
        rank: 1,
        origin: { name: "United States", code: "US", lat: 39.44, lng: -99.41 },
        target: { name: "Canada", code: "CA", lat: 61.39, lng: -99.46 },
        value: 8.42,
        valueLabel: "8.42%",
        mode: "corridor",
        hasArc: true,
      },
    ],
    warnings: [],
    ...overrides,
  };
}

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

function errorResponse(status, body) {
  return { ok: false, status, json: async () => body };
}

describe("useRadarData", () => {
  it("loads data and reports connected", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse(livePayload()));

    const { result } = renderHook(() => useRadarData({ layer: "l7", range: "1d", limit: 10 }));

    expect(result.current.status).toBe(RADAR_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(RADAR_STATUS.CONNECTED));
    expect(result.current.corridors).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain("layer=l7");
  });

  it("reports unavailable with the server's message when the first load fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      errorResponse(503, {
        success: false,
        error: { code: "token_missing", message: "Radar API token is not configured on the server." },
      }),
    );

    const { result } = renderHook(() => useRadarData({ layer: "l7", range: "1d", limit: 10 }));

    await waitFor(() => expect(result.current.status).toBe(RADAR_STATUS.UNAVAILABLE));
    expect(result.current.error.code).toBe("token_missing");
    expect(result.current.error.message).toMatch(/token is not configured/);
    expect(result.current.corridors).toEqual([]);
  });

  it("keeps the last successful dataset and marks it stale after a failed refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(livePayload()))
      .mockResolvedValueOnce(
        errorResponse(502, {
          success: false,
          error: { code: "upstream_unavailable", message: "Radar is temporarily unavailable." },
        }),
      );
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useRadarData({ layer: "l7", range: "1d", limit: 10 }));
    await waitFor(() => expect(result.current.status).toBe(RADAR_STATUS.CONNECTED));

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.status).toBe(RADAR_STATUS.STALE));
    expect(result.current.corridors).toHaveLength(1);
    expect(result.current.error.code).toBe("upstream_unavailable");
  });

  it("aborts an in-flight request when the selection changes and never mixes datasets", async () => {
    const pending = [];
    globalThis.fetch = vi.fn((url, options) => {
      if (String(url).includes("layer=l3")) {
        return Promise.resolve(
          okResponse(livePayload({ layer: "l3", corridors: [], metric: { label: "L3", unit: "percent" } })),
        );
      }
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
        pending.push(resolve);
      });
    });

    const { result, rerender } = renderHook(
      ({ layer }) => useRadarData({ layer, range: "1d", limit: 10 }),
      { initialProps: { layer: "l7" } },
    );

    expect(result.current.status).toBe(RADAR_STATUS.LOADING);

    rerender({ layer: "l3" });

    await waitFor(() => expect(result.current.status).toBe(RADAR_STATUS.CONNECTED));
    expect(result.current.data.layer).toBe("l3");
    expect(result.current.corridors).toEqual([]);
  });
});
