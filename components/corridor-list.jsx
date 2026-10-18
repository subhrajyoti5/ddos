"use client";

/**
 * Corridor list (PRD FR-04). Every row is a real button: focusable, labelled
 * with its full reading, and pressed/selected state is exposed via
 * `aria-pressed`. Bars are decorative emphasis (they encode the same value as
 * the adjacent label), so they are hidden from assistive technology.
 *
 * Rows always carry their own labels, so nothing here becomes meaningless if
 * the globe fails to render.
 */
import { useMemo } from "react";
import { IconArrowRight, IconInfo } from "@/components/icons";
import { formatUtcTimestamp } from "@/lib/format";
import { LAYER_DETAILS, RANGE_DETAILS } from "@/lib/radar-config";

function CodeChip({ code }) {
  if (!code) return null;
  return (
    <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[10px] font-semibold tracking-wide text-[#9BA7B8]">
      {code}
    </span>
  );
}

function Row({ corridor, maxValue, selected, onSelect, layerDetail }) {
  const { rank, origin, target, value, valueLabel, mode, hasArc } = corridor;
  const barWidth =
    typeof value === "number" && maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 0;

  const targetPhrase = target ? ` to ${target.name}${target.code ? ` (${target.code})` : ""}` : "";
  const modePhrase = mode === "origin" ? " reported origin location" : "";
  const ariaLabel = `Rank ${rank}: ${origin.name}${origin.code ? ` (${origin.code})` : ""}${targetPhrase}${modePhrase} \u2014 ${valueLabel}. ${
    hasArc ? "Plotted on the globe." : "Not plotted on the globe (missing location coordinates)."
  } Select to ${selected ? "clear the highlight" : "highlight it on the globe"}.`;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(selected ? null : rank)}
        aria-pressed={selected}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
          selected
            ? "border-cyan-300/50 bg-cyan-400/[0.08]"
            : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border font-mono text-[11px] font-semibold ${
            selected
              ? "border-cyan-300/50 text-cyan-200"
              : "border-white/10 text-[#9BA7B8] group-hover:text-[#F3F6FC]"
          }`}
        >
          {rank}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-tight">
            <span className="truncate font-medium text-[#F3F6FC]">{origin.name}</span>
            <CodeChip code={origin.code} />
            {target ? (
              <>
                <IconArrowRight className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                <span className="truncate text-[13px] text-[#C7D2E0]">{target.name}</span>
                <CodeChip code={target.code} />
              </>
            ) : (
              <span className="rounded border border-white/10 px-1 py-px text-[10px] uppercase tracking-wide text-[#9BA7B8]">
                {layerDetail?.short ?? "L3"} origin
              </span>
            )}
          </span>
          <span aria-hidden="true" className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-white/[0.06]">
            <span
              className={`block h-full rounded-full ${selected ? "bg-cyan-200" : "bg-cyan-400/70"}`}
              style={{ width: `${barWidth}%` }}
            />
          </span>
        </span>

        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-[#F3F6FC]">
          {valueLabel}
        </span>
      </button>
    </li>
  );
}

export default function CorridorList({
  corridors,
  metric,
  layer,
  range,
  selectedRank,
  onSelect,
  fetchedAt,
}) {
  const layerDetail = LAYER_DETAILS[layer] ?? LAYER_DETAILS.l7;
  const rangeDetail = RANGE_DETAILS[range] ?? RANGE_DETAILS["1d"];

  const maxValue = useMemo(() => {
    const values = corridors
      .map((corridor) => corridor.value)
      .filter((value) => typeof value === "number" && Number.isFinite(value));
    return values.length > 0 ? Math.max(...values) : 0;
  }, [corridors]);

  const selected = useMemo(
    () => corridors.find((corridor) => corridor.rank === selectedRank) ?? null,
    [corridors, selectedRank],
  );

  if (corridors.length === 0) {
    return (
      <div className="rounded-md border border-white/[0.07] bg-white/[0.02] px-4 py-6 text-center">
        <p className="text-sm font-medium text-[#F3F6FC]">No corridors returned for this selection.</p>
        <p className="mt-1 text-xs leading-relaxed text-[#9BA7B8]">
          Try the 7-day window, or switch the layer. Network (L3) currently reports origin locations
          without target countries.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2" aria-label="Top corridors, ranked">
        {corridors.map((corridor) => (
          <Row
            key={`${corridor.rank}-${corridor.origin.code ?? corridor.origin.name}`}
            corridor={corridor}
            maxValue={maxValue}
            selected={corridor.rank === selectedRank}
            onSelect={onSelect}
            layerDetail={layerDetail}
          />
        ))}
      </ol>

      {selected ? (
        <div
          className="rounded-md border border-cyan-300/25 bg-cyan-400/[0.04] px-3 py-3"
          role="region"
          aria-label={`Details for rank ${selected.rank}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.18em] text-[#9BA7B8]">
                RANK {selected.rank} DETAIL
              </p>
              <p className="mt-1 text-sm font-semibold text-[#F3F6FC]">
                {selected.origin.name}
                {selected.origin.code ? ` (${selected.origin.code})` : ""}
                {selected.target
                  ? ` \u2192 ${selected.target.name}${selected.target.code ? ` (${selected.target.code})` : ""}`
                  : " \u00b7 origin location"}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm font-semibold text-cyan-200">{selected.valueLabel}</p>
          </div>

          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-[11px] sm:grid-cols-2">
            <div className="flex flex-col">
              <dt className="text-[#9BA7B8]">Metric</dt>
              <dd className="text-[#C7D2E0]">{metric?.label ?? layerDetail.metricLabel}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-[#9BA7B8]">Layer</dt>
              <dd className="text-[#C7D2E0]">{layerDetail.label}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-[#9BA7B8]">Window</dt>
              <dd className="text-[#C7D2E0]">{rangeDetail.label}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-[#9BA7B8]">Location source</dt>
              <dd className="text-[#C7D2E0]">
                {selected.target
                  ? "Country centroids for both endpoints (world-countries dataset)"
                  : "Country centroid for the reported origin (world-countries dataset)"}
              </dd>
            </div>
            <div className="flex flex-col sm:col-span-2">
              <dt className="text-[#9BA7B8]">Fetched at</dt>
              <dd className="text-[#C7D2E0]">{formatUtcTimestamp(fetchedAt) ?? "\u2014"}</dd>
            </div>
          </dl>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#9BA7B8]">
            <IconInfo className="mt-px h-3.5 w-3.5 shrink-0 text-cyan-300/80" />
            <span>
              Country-level aggregate, not an individual attack event.
              {selected.target
                ? " Origin and target are both approximate country locations."
                : " This is a reported origin location; the endpoint does not return target countries."}
            </span>
          </p>
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-[#9BA7B8]">{layerDetail.selectionHint}</p>
      )}
    </div>
  );
}
