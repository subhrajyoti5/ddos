"use client";

/**
 * Telemetry strip (PRD FR-05). Four plain-language readouts, always rendered in
 * a fixed order so the grid cannot shift when data arrives.
 *
 * "Last updated" honesty rule: the phrase "Radar dataset" is used only when the
 * upstream API actually returned `meta.lastUpdated`; otherwise the field is
 * labelled "Fetched at" and the dataset freshness is explicitly unknown.
 */
import { formatRelativeTime, formatUtcTimestamp } from "@/lib/format";
import { LAYER_DETAILS, RANGE_DETAILS } from "@/lib/radar-config";

function Cell({ term, value, sub, title }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3 first:pl-0 last:pr-0 sm:border-l sm:border-white/[0.07] sm:first:border-l-0" title={title}>
      <dt className="font-mono text-[10px] font-medium tracking-[0.18em] text-[#9BA7B8]">{term}</dt>
      <dd className="truncate text-sm font-semibold text-[#F3F6FC]">{value}</dd>
      {sub ? <dd className="truncate text-[11px] text-[#9BA7B8]">{sub}</dd> : null}
    </div>
  );
}

export default function TelemetryStrip({ data, status, now }) {
  const corridors = data?.corridors ?? [];
  const layer = data?.layer ?? null;
  const range = data?.range ?? null;
  const detail = layer ? LAYER_DETAILS[layer] : null;
  const rangeDetail = range ? RANGE_DETAILS[range] : null;

  const first = corridors[0] ?? null;

  const upstreamUpdated = data?.upstreamLastUpdated ?? null;
  const fetchedAt = data?.fetchedAt ?? null;

  let updatedTerm = "LAST UPDATED";
  let updatedValue = "\u2014";
  let updatedSub = null;
  let updatedTitle;
  if (data?.mode === "demo") {
    updatedValue = "Demo data";
    updatedSub = "No upstream clock is simulated for sample rows";
    updatedTitle = "Demo mode shows sample rows; nothing here is a live timestamp.";
  } else if (upstreamUpdated) {
    updatedValue = formatRelativeTime(upstreamUpdated, now) ?? "\u2014";
    updatedSub = `Radar dataset \u00b7 ${formatUtcTimestamp(upstreamUpdated) ?? "timestamp unavailable"}`;
    updatedTitle = `Cloudflare Radar reports meta.lastUpdated = ${upstreamUpdated}`;
  } else if (fetchedAt) {
    updatedTerm = "FETCHED AT";
    updatedValue = formatRelativeTime(fetchedAt, now) ?? "\u2014";
    updatedSub = `${formatUtcTimestamp(fetchedAt) ?? "timestamp unavailable"} \u00b7 dataset update time not reported`;
    updatedTitle =
      "The API did not report a dataset update time, so this shows when this page last fetched data.";
  }

  let windowSub = null;
  if (data?.dateRange?.startTime && data?.dateRange?.endTime) {
    windowSub = `${formatUtcTimestamp(data.dateRange.startTime) ?? data.dateRange.startTime} \u2192 ${formatUtcTimestamp(data.dateRange.endTime) ?? data.dateRange.endTime}`;
  } else if (status === "loading") {
    windowSub = "Resolving upstream window\u2026";
  } else if (status === "unavailable") {
    windowSub = "Unavailable";
  }

  let countSub = null;
  if (detail) {
    countSub = first && first.mode === "origin" ? "origin locations returned" : `reported ${detail.pairNoun}`;
  }

  const leadSub = first
    ? `${first.valueLabel} \u00b7 rank 1 of ${corridors.length}`
    : status === "loading"
      ? "Waiting for the first dataset"
      : "No rows returned";

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-white/[0.07] bg-[#080C14]/80 px-4 py-1.5 sm:grid-cols-4 sm:divide-white/[0.07]">
      <Cell
        term="DATA WINDOW"
        value={rangeDetail ? rangeDetail.label : "\u2014"}
        sub={windowSub}
        title="The aggregation window reported by the upstream API for this dataset."
      />
      <Cell
        term="TOP CORRIDORS"
        value={corridors.length > 0 ? String(corridors.length) : "\u2014"}
        sub={countSub}
        title="Number of country-level rows in the current selection."
      />
      <Cell
        term="LEADING ORIGIN"
        value={first ? `${first.origin.name}${first.origin.code ? ` (${first.origin.code})` : ""}` : "\u2014"}
        sub={leadSub}
        title={
          first
            ? `Highest-ranked reported origin in this selection: ${first.valueLabel}`
            : "No leading origin for this selection."
        }
      />
      <Cell term={updatedTerm} value={updatedValue} sub={updatedSub} title={updatedTitle} />
    </dl>
  );
}
