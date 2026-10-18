"use client";

/**
 * Corridor list (PRD FR-04). Every row is a real button: focusable, labelled
 * with its full reading, and pressed/selected state is exposed via
 * `aria-pressed`.
 *
 * Rows always carry their own labels, so nothing here becomes meaningless if
 * the globe fails to render. Visually the list is deliberately quiet: hairline
 * dividers only, no boxes, no chrome.
 */
import { LAYER_DETAILS } from "@/lib/radar-config";

function Row({ corridor, selected, onSelect, layerDetail }) {
  const { rank, origin, target, valueLabel, mode, hasArc } = corridor;

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
        className={`group flex w-full items-baseline gap-4 py-3 text-left transition-colors focus-visible:bg-white/[0.03] focus-visible:outline-none ${
          selected ? "bg-cyan-400/[0.05]" : "hover:bg-white/[0.02]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`w-6 shrink-0 font-mono text-[11px] ${
            selected ? "text-cyan-300" : "text-white/25 group-hover:text-white/40"
          }`}
        >
          {rank}
        </span>

        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-sm leading-snug">
          <span className={`truncate ${selected ? "text-cyan-100" : "text-[#F3F6FC]"}`}>
            {origin.name}
          </span>
          {origin.code ? (
            <span className="font-mono text-[10px] text-white/25">{origin.code}</span>
          ) : null}
          {target ? (
            <>
              <span aria-hidden="true" className="text-white/25">
                &#8594;
              </span>
              <span className="truncate text-white/60 group-hover:text-white/80">
                {target.name}
              </span>
              {target.code ? (
                <span className="font-mono text-[10px] text-white/25">{target.code}</span>
              ) : null}
            </>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
              {layerDetail?.short ?? "L3"} origin
            </span>
          )}
        </span>

        <span
          className={`shrink-0 font-mono text-sm tabular-nums ${
            selected ? "text-cyan-200" : "text-white/80"
          }`}
        >
          {valueLabel}
        </span>
      </button>
    </li>
  );
}

export default function CorridorList({ corridors, layer, selectedRank, onSelect }) {
  const layerDetail = LAYER_DETAILS[layer] ?? LAYER_DETAILS.l7;
  const selected = corridors.find((corridor) => corridor.rank === selectedRank) ?? null;

  if (corridors.length === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-[#F3F6FC]">No corridors returned for this selection.</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-white/35">
          Try the 7-day window, or switch the layer. Network (L3) currently reports origin locations
          without target countries.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ol className="divide-y divide-white/[0.07]" aria-label="Top corridors, ranked">
        {corridors.map((corridor) => (
          <Row
            key={`${corridor.rank}-${corridor.origin.code ?? corridor.origin.name}`}
            corridor={corridor}
            selected={corridor.rank === selectedRank}
            onSelect={onSelect}
            layerDetail={layerDetail}
          />
        ))}
      </ol>

      {selected ? (
        <div
          role="region"
          aria-label={`Details for rank ${selected.rank}`}
          className="border-t border-white/[0.07] py-3"
        >
          <p className="text-[11px] leading-relaxed text-white/35">
            Country-level aggregate, not an individual attack event.{" "}
            {selected.target
              ? "Origin and target are approximate country locations."
              : "Reported origin location; this endpoint does not return target countries."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
