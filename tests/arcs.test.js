import { describe, expect, it } from "vitest";
import { buildArcs } from "@/lib/arcs";
import { ARC_STYLE } from "@/lib/radar-config";

function corridor(overrides = {}) {
  return {
    rank: 1,
    origin: { name: "United States", code: "US", lat: 39.44, lng: -99.41 },
    target: { name: "Canada", code: "CA", lat: 61.39, lng: -99.46 },
    value: 8.42,
    valueLabel: "8.42%",
    mode: "corridor",
    hasArc: true,
    ...overrides,
  };
}

describe("buildArcs", () => {
  it("returns an empty list for missing or unplottable data", () => {
    expect(buildArcs(null)).toEqual([]);
    expect(buildArcs([])).toEqual([]);
    expect(buildArcs([corridor({ hasArc: false })])).toEqual([]);
  });

  it("maps a corridor to a start/end arc with rank-derived dash order", () => {
    const [arc] = buildArcs([corridor()]);

    expect(arc.startLat).toBe(39.44);
    expect(arc.startLng).toBe(-99.41);
    expect(arc.endLat).toBe(61.39);
    expect(arc.endLng).toBe(-99.46);
    expect(arc.order).toBe(1);
    expect(arc.color).toBe(ARC_STYLE.l7.base);
    expect(arc.arcAlt).toBeGreaterThanOrEqual(0.18);
    expect(arc.arcAlt).toBeLessThanOrEqual(0.42);
  });

  it("collapses origin-only rows to a marker (start === end)", () => {
    const [arc] = buildArcs(
      [corridor({ target: null, mode: "origin", needsArc: true })],
      { layer: "l3" },
    );

    expect(arc.startLat).toBe(arc.endLat);
    expect(arc.startLng).toBe(arc.endLng);
    expect(arc.color).toBe(ARC_STYLE.l3.base);
  });

  it("keeps altitude ordering deterministic and proportional to reported share", () => {
    const arcs = buildArcs([
      corridor({ rank: 1, value: 10 }),
      corridor({ rank: 2, value: 5, origin: { name: "China", code: "CN", lat: 35.86, lng: 104.2 } }),
    ]);

    expect(arcs[0].arcAlt).toBeGreaterThan(arcs[1].arcAlt);

    const again = buildArcs([
      corridor({ rank: 1, value: 10 }),
      corridor({ rank: 2, value: 5, origin: { name: "China", code: "CN", lat: 35.86, lng: 104.2 } }),
    ]);
    expect(again).toEqual(arcs);
  });

  it("highlights the selected rank and dims the rest", () => {
    const arcs = buildArcs(
      [corridor({ rank: 1 }), corridor({ rank: 2, origin: { name: "China", code: "CN", lat: 35.86, lng: 104.2 } })],
      { selectedRank: 2 },
    );

    expect(arcs[0].color).toBe(ARC_STYLE.l7.dim);
    expect(arcs[1].color).toBe(ARC_STYLE.selected);
  });
});
