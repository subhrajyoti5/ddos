import { describe, expect, it } from "vitest";
import { formatRelativeTime, formatUtcTimestamp } from "@/lib/format";

describe("formatUtcTimestamp", () => {
  it("renders a stable UTC string in a fixed locale", () => {
    expect(formatUtcTimestamp("2026-10-18T00:04:00Z")).toBe("18 Oct 2026, 00:04 UTC");
  });

  it("returns null for missing or invalid values instead of crashing", () => {
    expect(formatUtcTimestamp(null)).toBeNull();
    expect(formatUtcTimestamp(undefined)).toBeNull();
    expect(formatUtcTimestamp("not a date")).toBeNull();
  });
});

describe("formatRelativeTime", () => {
  const base = Date.parse("2026-10-18T12:00:00Z");

  it("describes recent, hourly and daily ages", () => {
    expect(formatRelativeTime("2026-10-18T11:59:40Z", base)).toBe("just now");
    expect(formatRelativeTime("2026-10-18T11:56:00Z", base)).toBe("4 min ago");
    expect(formatRelativeTime("2026-10-18T09:00:00Z", base)).toBe("3 h ago");
    expect(formatRelativeTime("2026-10-16T12:00:00Z", base)).toBe("2 d ago");
  });

  it("never reports negative ages for clock skew", () => {
    expect(formatRelativeTime("2026-10-18T12:05:00Z", base)).toBe("just now");
  });
});
