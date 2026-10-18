import { describe, expect, it } from "vitest";
import l7Fixture from "./fixtures/l7-top-attacks.json";
import l3Fixture from "./fixtures/l3-top-attacks.json";
import { normalizeTopAttacks } from "@/lib/normalize-radar";

function clone(fixture) {
  return JSON.parse(JSON.stringify(fixture));
}

describe("normalizeTopAttacks (Layer 7)", () => {
  it("maps top_0 rows and derives rank from array order", () => {
    const payload = normalizeTopAttacks({
      layer: "l7",
      range: "1d",
      payload: clone(l7Fixture),
      fetchedAt: "2026-10-18T00:10:00Z",
    });

    expect(payload.success).toBe(true);
    expect(payload.mode).toBe("live");
    expect(payload.corridors).toHaveLength(3);
    expect(payload.corridors.map((row) => row.rank)).toEqual([1, 2, 3]);

    const first = payload.corridors[0];
    expect(first.origin).toMatchObject({ name: "United States", code: "US" });
    expect(typeof first.origin.lat).toBe("number");
    expect(first.target).toMatchObject({ name: "Canada", code: "CA" });
    expect(first.mode).toBe("corridor");
    expect(first.hasArc).toBe(true);
    expect(first.value).toBeCloseTo(8.42);
    expect(first.valueLabel).toBe("8.42%");
  });

  it("reports metric metadata and upstream freshness honestly", () => {
    const payload = normalizeTopAttacks({
      layer: "l7",
      range: "1d",
      payload: clone(l7Fixture),
      fetchedAt: "2026-10-18T00:10:00Z",
    });

    expect(payload.metric).toMatchObject({
      unit: "percent",
      normalization: "PERCENTAGE",
      sourceUnit: "requests",
    });
    expect(payload.upstreamLastUpdated).toBe("2026-10-18T00:04:00Z");
    expect(payload.dateRange).toEqual({
      startTime: "2026-10-17T00:00:00Z",
      endTime: "2026-10-18T00:00:00Z",
    });
    expect(payload.warnings).toEqual([]);
  });

  it("omits the arc for unknown centroids but keeps the row", () => {
    const fixture = clone(l7Fixture);
    fixture.result.top_0[1].originCountryAlpha2 = "XX";
    fixture.result.top_0[1].originCountryName = "Nowhere";

    const payload = normalizeTopAttacks({
      layer: "l7",
      range: "1d",
      payload: fixture,
      fetchedAt: "2026-10-18T00:10:00Z",
    });

    const row = payload.corridors[1];
    expect(row.origin.code).toBe("XX");
    expect(row.hasArc).toBe(false);
    expect(payload.warnings.some((warning) => warning.code === "missing_centroid")).toBe(true);
  });

  it("does not claim a percentage when the API normalizes differently", () => {
    const fixture = clone(l7Fixture);
    fixture.result.meta.normalization = "MIN_MAX";

    const payload = normalizeTopAttacks({
      layer: "l7",
      range: "1d",
      payload: fixture,
      fetchedAt: "2026-10-18T00:10:00Z",
    });

    expect(payload.metric.unit).toBe("index");
    expect(payload.metric.label).toMatch(/relative index/);
    expect(payload.corridors[0].valueLabel).toBe("8.4");
    expect(payload.warnings.some((warning) => warning.code === "normalization_relative_index")).toBe(true);
  });
});

describe("normalizeTopAttacks (Layer 3)", () => {
  it("renders origin-only rows as markers and never invents a target", () => {
    const payload = normalizeTopAttacks({
      layer: "l3",
      range: "7d",
      payload: clone(l3Fixture),
      fetchedAt: "2026-10-18T00:10:00Z",
    });

    expect(payload.corridors).toHaveLength(3);
    for (const row of payload.corridors) {
      expect(row.target).toBeNull();
      expect(row.mode).toBe("origin");
      expect(row.hasArc).toBe(true);
    }
    expect(payload.corridors[0].origin).toMatchObject({ name: "Russia", code: "RU" });
    expect(payload.warnings.some((warning) => warning.code === "origin_only_endpoint")).toBe(true);
  });

  it("survives an empty result set", () => {
    const fixture = clone(l3Fixture);
    fixture.result.top_0 = [];

    const payload = normalizeTopAttacks({
      layer: "l3",
      range: "1d",
      payload: fixture,
      fetchedAt: "2026-10-18T00:10:00Z",
    });

    expect(payload.corridors).toEqual([]);
    expect(payload.success).toBe(true);
  });
});
