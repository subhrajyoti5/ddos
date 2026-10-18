import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CorridorList from "@/components/corridor-list";

const corridors = [
  {
    rank: 1,
    origin: { name: "United States", code: "US", lat: 39.44, lng: -99.41 },
    target: { name: "Canada", code: "CA", lat: 61.39, lng: -99.46 },
    value: 8.42,
    valueLabel: "8.42%",
    mode: "corridor",
    hasArc: true,
  },
  {
    rank: 2,
    origin: { name: "Russia", code: "RU", lat: 61.52, lng: 105.32 },
    target: null,
    value: 5.41,
    valueLabel: "5.41%",
    mode: "origin",
    hasArc: true,
  },
];

const metric = { label: "Share of total mitigated Layer 7 attack requests", unit: "percent" };

describe("CorridorList", () => {
  it("renders labelled rows and exposes value labels as text", () => {
    render(
      <CorridorList
        corridors={corridors}
        metric={metric}
        layer="l7"
        range="1d"
        selectedRank={null}
        onSelect={() => {}}
        fetchedAt="2026-10-18T00:10:00Z"
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("8.42%")).toBeTruthy();
    expect(screen.getByText("5.41%")).toBeTruthy();

    const first = screen.getByRole("button", { name: /Rank 1: United States \(US\) to Canada \(CA\)/ });
    expect(first.getAttribute("aria-pressed")).toBe("false");
    expect(first.getAttribute("aria-label")).toMatch(/Plotted on the globe/);
  });

  it("marks origin-only rows as origin locations, not corridors", () => {
    render(
      <CorridorList
        corridors={corridors}
        metric={metric}
        layer="l3"
        range="7d"
        selectedRank={null}
        onSelect={() => {}}
        fetchedAt={null}
      />,
    );

    const row = screen.getByRole("button", { name: /Rank 2: Russia \(RU\) reported origin location/ });
    expect(row.getAttribute("aria-label")).toMatch(/does not return target countries|reported origin/);
    expect(screen.getByText("L3 origin")).toBeTruthy();
  });

  it("reports selection changes and exposes the pressed state", () => {
    const onSelect = vi.fn();

    const { rerender } = render(
      <CorridorList
        corridors={corridors}
        metric={metric}
        layer="l7"
        range="1d"
        selectedRank={null}
        onSelect={onSelect}
        fetchedAt={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Rank 1/ }));
    expect(onSelect).toHaveBeenCalledWith(1);

    rerender(
      <CorridorList
        corridors={corridors}
        metric={metric}
        layer="l7"
        range="1d"
        selectedRank={1}
        onSelect={onSelect}
        fetchedAt={null}
      />,
    );

    expect(screen.getByRole("button", { name: /Rank 1/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("region", { name: /Details for rank 1/ })).toBeTruthy();
    expect(screen.getByText(/Country-level aggregate, not an individual attack event/)).toBeTruthy();
  });

  it("shows an honest empty state with a next step", () => {
    render(
      <CorridorList
        corridors={[]}
        metric={metric}
        layer="l3"
        range="1d"
        selectedRank={null}
        onSelect={() => {}}
        fetchedAt={null}
      />,
    );

    expect(screen.getByText("No corridors returned for this selection.")).toBeTruthy();
    expect(screen.getByText(/7-day window/)).toBeTruthy();
  });
});
