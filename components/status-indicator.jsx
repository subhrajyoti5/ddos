"use client";

/**
 * Status indicator (PRD FR-06). Read-only display of the data state machine;
 * announcements are polite so polling never interrupts a screen reader.
 */
import { IconSpinner } from "@/components/icons";
import { formatRelativeTime } from "@/lib/format";
import { RADAR_STATUS } from "@/hooks/use-radar-data";

const DOT_STYLES = {
  [RADAR_STATUS.CONNECTED]: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
  [RADAR_STATUS.STALE]: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]",
  [RADAR_STATUS.UNAVAILABLE]: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]",
  [RADAR_STATUS.LOADING]: "bg-sky-400 motion-safe:animate-pulse",
  [RADAR_STATUS.DEMO]: "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]",
};

function describe(status, { lastSuccessAt, error, now }) {
  switch (status) {
    case RADAR_STATUS.CONNECTED: {
      const relative = lastSuccessAt ? formatRelativeTime(lastSuccessAt, now) : null;
      return relative ? `Live from Cloudflare Radar \u00b7 updated ${relative}` : "Live from Cloudflare Radar";
    }
    case RADAR_STATUS.STALE: {
      const relative = lastSuccessAt ? formatRelativeTime(lastSuccessAt, now) : null;
      const base = relative
        ? `Showing last successful data (${relative}); retrying automatically`
        : "Showing last successful data; retrying automatically";
      return error?.message ? `${base}. ${error.message}` : base;
    }
    case RADAR_STATUS.UNAVAILABLE:
      return error?.message ?? "Radar data is not available right now.";
    case RADAR_STATUS.DEMO:
      return "Demo mode: sample data for local development, not live telemetry";
    default:
      return "Requesting the latest dataset\u2026";
  }
}

const LABELS = {
  [RADAR_STATUS.CONNECTED]: "CONNECTED",
  [RADAR_STATUS.STALE]: "STALE",
  [RADAR_STATUS.UNAVAILABLE]: "UNAVAILABLE",
  [RADAR_STATUS.LOADING]: "CONNECTING",
  [RADAR_STATUS.DEMO]: "DEMO",
};

export default function StatusIndicator({ status, isRefreshing, lastSuccessAt, error, now }) {
  const label = LABELS[status] ?? "UNKNOWN";
  const description = describe(status, { lastSuccessAt, error, now });

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2.5">
      <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${DOT_STYLES[status] ?? DOT_STYLES[RADAR_STATUS.LOADING]}`}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#F3F6FC]">
          {label}
          {isRefreshing ? <IconSpinner className="h-3 w-3 text-[#9BA7B8]" /> : null}
        </span>
        <span className="truncate text-[11px] leading-4 text-[#9BA7B8]" title={description}>
          {description}
        </span>
      </span>
    </div>
  );
}
