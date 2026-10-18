"use client";

/**
 * Layer / window / limit selectors plus the globe rotation toggle.
 *
 * The selectors are proper radiogroups: arrow keys move the selection, Home and
 * End jump to the ends, and only the selected item is in the tab order. Each
 * control carries a plain-language tooltip explaining the option.
 */
import { useId, useRef } from "react";
import { IconPause, IconPlay } from "@/components/icons";

function SegmentedControl({ label, hint, options, value, onChange }) {
  const legendId = useId();
  const refs = useRef([]);
  const selectedIndex = options.findIndex((option) => option.value === value);

  const selectAt = (index) => {
    const next = options[(index + options.length) % options.length];
    onChange(next.value);
    refs.current[(index + options.length) % options.length]?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectAt(selectedIndex + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectAt(selectedIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAt(options.length - 1);
    }
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend
        id={legendId}
        className="font-mono text-[10px] font-medium tracking-[0.18em] text-[#9BA7B8]"
      >
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-labelledby={legendId}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-1 rounded-md border border-white/[0.08] bg-[#080C14] p-1"
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              title={option.title}
              onClick={() => onChange(option.value)}
              className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
                selected
                  ? "bg-cyan-400/15 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.35)]"
                  : "text-[#9BA7B8] hover:bg-white/[0.05] hover:text-[#F3F6FC]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {hint ? <p className="max-w-[220px] text-[11px] leading-relaxed text-[#9BA7B8]">{hint}</p> : null}
    </fieldset>
  );
}

const LAYER_OPTIONS = [
  {
    value: "l7",
    label: "Application (L7)",
    title: "Application-layer attacks: reported origin \u2192 target country corridors.",
  },
  {
    value: "l3",
    label: "Network (L3)",
    title:
      "Network-layer attacks. Cloudflare reports origin locations only (no target country), and attributes them to the Cloudflare data-center location.",
  },
];

const RANGE_OPTIONS = [
  { value: "1d", label: "24h", title: "Aggregate attack activity over the last 24 hours." },
  { value: "7d", label: "7d", title: "Aggregate attack activity over the last 7 days." },
];

const LIMIT_OPTIONS = [
  { value: 5, label: "5", title: "Show the top 5 rows." },
  { value: 10, label: "10", title: "Show the top 10 rows." },
  { value: 20, label: "20", title: "Show the top 20 rows." },
];

export default function LayerSwitcher({
  layer,
  range,
  limit,
  onLayerChange,
  onRangeChange,
  onLimitChange,
  rotationPaused,
  onToggleRotation,
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
      <SegmentedControl
        label="LAYER"
        options={LAYER_OPTIONS}
        value={layer}
        onChange={onLayerChange}
        hint={layer === "l3" ? "Origin locations only, as reported by this endpoint." : null}
      />
      <SegmentedControl
        label="WINDOW"
        options={RANGE_OPTIONS}
        value={range}
        onChange={onRangeChange}
      />
      <SegmentedControl
        label="ROWS"
        options={LIMIT_OPTIONS}
        value={limit}
        onChange={onLimitChange}
      />
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] font-medium tracking-[0.18em] text-[#9BA7B8]">
          GLOBE
        </span>
        <button
          type="button"
          aria-pressed={rotationPaused}
          onClick={() => onToggleRotation(!rotationPaused)}
          title={rotationPaused ? "Resume automatic globe rotation." : "Pause automatic globe rotation."}
          className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#080C14] px-2.5 py-1.5 text-xs font-medium text-[#9BA7B8] transition-colors hover:bg-white/[0.05] hover:text-[#F3F6FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        >
          {rotationPaused ? <IconPlay className="h-3.5 w-3.5" /> : <IconPause className="h-3.5 w-3.5" />}
          {rotationPaused ? "Resume rotation" : "Pause rotation"}
        </button>
      </div>
    </div>
  );
}
