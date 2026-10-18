"use client";

/**
 * Layer / window / limit selectors plus the globe rotation toggle.
 *
 * Rendered as one quiet line of text: no boxes, no legends. The selectors keep
 * radiogroup semantics (arrow keys move the selection, Home and End jump to the
 * ends, only the selected item is in the tab order) and each control carries a
 * plain-language tooltip explaining the option.
 */
import { useRef } from "react";
import { IconPause, IconPlay } from "@/components/icons";

function SegmentedControl({ label, options, value, onChange }) {
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
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex items-center gap-3"
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
            className={`font-mono text-[11px] tracking-[0.08em] transition-colors focus-visible:text-[#F3F6FC] focus-visible:outline-none ${
              selected
                ? "text-[#F3F6FC] underline decoration-cyan-300/60 underline-offset-4"
                : "text-white/30 hover:text-white/70"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="h-3 w-px bg-white/[0.1]" />;
}

const LAYER_OPTIONS = [
  {
    value: "l7",
    label: "L7",
    title: "Application-layer attacks: reported origin \u2192 target country corridors.",
  },
  {
    value: "l3",
    label: "L3",
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
    <div className="flex items-center justify-between gap-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <SegmentedControl
          label="Attack layer"
          options={LAYER_OPTIONS}
          value={layer}
          onChange={onLayerChange}
        />
        <Divider />
        <SegmentedControl
          label="Observation window"
          options={RANGE_OPTIONS}
          value={range}
          onChange={onRangeChange}
        />
        <Divider />
        <SegmentedControl
          label="Rows shown"
          options={LIMIT_OPTIONS}
          value={limit}
          onChange={onLimitChange}
        />
      </div>

      <button
        type="button"
        aria-pressed={rotationPaused}
        aria-label={rotationPaused ? "Resume globe rotation" : "Pause globe rotation"}
        title={
          rotationPaused ? "Resume automatic globe rotation." : "Pause automatic globe rotation."
        }
        onClick={() => onToggleRotation(!rotationPaused)}
        className="shrink-0 text-white/30 transition-colors hover:text-white/70 focus-visible:text-[#F3F6FC] focus-visible:outline-none"
      >
        {rotationPaused ? <IconPlay className="h-3.5 w-3.5" /> : <IconPause className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
