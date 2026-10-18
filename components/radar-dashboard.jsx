"use client";

/**
 * Dashboard shell. Owns selection state (layer / window / rows / highlighted
 * corridor / rotation) and composes the globe, telemetry strip, corridor list,
 * and disclosures. All labelling rules live in the child components.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import CorridorList from "@/components/corridor-list";
import DemoBanner from "@/components/demo-banner";
import { IconAlert, IconInfo, IconRadar, IconRefresh } from "@/components/icons";
import LayerSwitcher from "@/components/layer-switcher";
import LoadingState from "@/components/loading-state";
import RadarGlobe from "@/components/radar-globe";
import StatusIndicator from "@/components/status-indicator";
import TelemetryStrip from "@/components/telemetry-strip";
import { RADAR_STATUS, useRadarData } from "@/hooks/use-radar-data";
import { buildArcs } from "@/lib/arcs";
import { COUNTRY_CENTROID_SOURCE } from "@/lib/country-centroids";
import { formatRelativeTime } from "@/lib/format";
import {
  DEFAULT_LAYER,
  DEFAULT_LIMIT,
  DEFAULT_RANGE,
  DEFAULT_REFRESH_INTERVAL_MS,
  LAYER_DETAILS,
  RADAR_API_DOCS_URL,
  RANGE_DETAILS,
} from "@/lib/radar-config";

const CLIENT_DEMO_MODE = process.env.NEXT_PUBLIC_RADAR_DEMO_MODE === "true";

/** Optional deploy-time override; the hook clamps it to a sane minimum. */
const CLIENT_REFRESH_INTERVAL_MS = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_RADAR_REFRESH_INTERVAL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_INTERVAL_MS;
})();

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

function UnavailablePanel({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/[0.06] px-4 py-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-rose-100">
        <IconAlert className="h-4 w-4 text-rose-300" />
        Radar data unavailable
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-rose-200/80">
        {error?.message ?? "Radar data is temporarily unavailable."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-[#F3F6FC] transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
      >
        Try again
      </button>
    </div>
  );
}

function WarningNotes({ warnings }) {
  const visible = warnings.filter(
    (warning) => warning && warning.code !== "demo_data" && typeof warning.message === "string",
  );
  if (visible.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {visible.map((warning) => (
        <li
          key={warning.code}
          className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#C7A96B]"
        >
          <IconInfo className="mt-px h-3.5 w-3.5 shrink-0 text-amber-300/80" />
          <span>{warning.message}</span>
        </li>
      ))}
    </ul>
  );
}

export default function RadarDashboard() {
  const [layer, setLayer] = useState(DEFAULT_LAYER);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [selectedRank, setSelectedRank] = useState(null);
  const [rotationPaused, setRotationPaused] = useState(false);

  const reducedMotion = usePrefersReducedMotion();

  const radar = useRadarData({
    layer,
    range,
    limit,
    refreshIntervalMs: CLIENT_REFRESH_INTERVAL_MS,
    demoMode: CLIENT_DEMO_MODE,
  });

  const { status, data, corridors, metric, warnings, error, isRefreshing, lastSuccessAt, now, refresh } = radar;

  // A highlight belongs to the dataset it was chosen from, so changing the
  // selection clears it while the new dataset loads.
  const handleLayerChange = useCallback((next) => {
    setSelectedRank(null);
    setLayer(next);
  }, []);

  const handleRangeChange = useCallback((next) => {
    setSelectedRank(null);
    setRange(next);
  }, []);

  const handleLimitChange = useCallback((next) => {
    setSelectedRank(null);
    setLimit(next);
  }, []);

  const arcs = useMemo(
    () => buildArcs(corridors, { layer, selectedRank }),
    [corridors, layer, selectedRank],
  );

  const layerDetail = LAYER_DETAILS[layer] ?? LAYER_DETAILS.l7;
  const rangeDetail = RANGE_DETAILS[range] ?? RANGE_DETAILS["1d"];
  const isDemo = CLIENT_DEMO_MODE || data?.mode === "demo";
  const showStaleNote = status === RADAR_STATUS.STALE && error;

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const onSelectCorridor = useCallback((rank) => {
    setSelectedRank(rank);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.08]"
            >
              <IconRadar className="h-5 w-5 text-cyan-300" />
            </span>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[#F3F6FC]">
                Global DDoS Radar
              </h1>
              <p className="text-[11px] text-[#9BA7B8]">
                Cloudflare Radar &middot; country-level attack telemetry &middot; view-only
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <StatusIndicator
              status={status}
              isRefreshing={isRefreshing}
              lastSuccessAt={lastSuccessAt}
              error={error}
              now={now}
            />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isDemo}
              title="Fetch the latest dataset now"
              className="flex items-center gap-1.5 rounded-md border border-white/[0.12] bg-[#080C14] px-3 py-2 text-xs font-medium text-[#F3F6FC] transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconRefresh className={`h-3.5 w-3.5 ${isRefreshing ? "motion-safe:animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {isDemo ? <DemoBanner /> : null}

        <TelemetryStrip data={data} status={status} now={now} />

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <LayerSwitcher
            layer={layer}
            range={range}
            limit={limit}
            onLayerChange={handleLayerChange}
            onRangeChange={handleRangeChange}
            onLimitChange={handleLimitChange}
            rotationPaused={rotationPaused || reducedMotion}
            onToggleRotation={setRotationPaused}
          />
          <p className="max-w-md text-[11px] leading-relaxed text-[#9BA7B8]">
            {layerDetail.legend} &middot; {rangeDetail.label.toLowerCase()} &middot; metric:{" "}
            {metric?.label ?? layerDetail.metricLabel}
          </p>
        </div>

        <main className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section
            aria-label="Attack activity globe"
            className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#080C14]/60 lg:col-span-8"
          >
            <RadarGlobe
              arcs={arcs}
              autoRotate={!rotationPaused}
              reducedMotion={reducedMotion}
              className="h-[320px] w-full sm:h-[420px] lg:h-[540px]"
            />
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-white/[0.07] bg-[#030407]/80 px-3 py-1.5 text-[10px] text-[#9BA7B8]">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-3 rounded-full"
                  style={{ backgroundColor: layer === "l3" ? "#3b82f6" : "#06b6d4" }}
                />
                {layerDetail.legend}
              </span>
              <span>
                {arcs.length} of {corridors.length} rows plotted
              </span>
            </div>
          </section>

          <aside className="flex flex-col gap-3 lg:col-span-4" aria-label="Corridor list panel">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#F3F6FC]">Top corridors</h2>
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#9BA7B8]">
                {layerDetail.short} &middot; {rangeDetail.short}
              </span>
            </div>

            {showStaleNote ? (
              <p className="flex items-start gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100">
                <IconAlert className="mt-px h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>
                  Showing the last successful dataset
                  {lastSuccessAt ? ` (${formatRelativeTime(lastSuccessAt, now)})` : ""}. Latest refresh
                  failed: {error.message}
                </span>
              </p>
            ) : null}

            <WarningNotes warnings={warnings} />

            {status === RADAR_STATUS.LOADING ? (
              <LoadingState rows={limit > 10 ? 6 : limit} />
            ) : status === RADAR_STATUS.UNAVAILABLE ? (
              <UnavailablePanel error={error} onRetry={handleRefresh} />
            ) : (
              <CorridorList
                corridors={corridors}
                metric={metric}
                layer={layer}
                range={range}
                selectedRank={selectedRank}
                onSelect={onSelectCorridor}
                fetchedAt={data?.fetchedAt ?? null}
              />
            )}

            {selectedRank !== null ? (
              <p className="text-[11px] text-[#9BA7B8]">
                Highlighting rank {selectedRank} on the globe. Select it again to clear.
              </p>
            ) : null}
          </aside>
        </main>

        <footer className="mt-2 flex flex-col gap-2 border-t border-white/[0.07] pt-4 text-[11px] leading-relaxed text-[#9BA7B8]">
          <p>{layerDetail.disclosure}</p>
          {layerDetail.disclosureExtra ? <p>{layerDetail.disclosureExtra}</p> : null}
          <p>
            Source: Cloudflare Radar ({" "}
            <a
              href={RADAR_API_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
            >
              API documentation
            </a>
            ). Explicitly not real-time: Radar aggregates are published on its own cadence, so this
            view reflects the last published dataset, not attack events as they happen.
          </p>
          <p>
            Country centroids for globe plotting: {COUNTRY_CENTROID_SOURCE}. Centroids are visual
            anchors, not attack locations. Country borders: Natural Earth (public domain).
          </p>
        </footer>
      </div>
    </div>
  );
}
