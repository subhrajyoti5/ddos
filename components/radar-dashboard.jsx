"use client";

/**
 * Dashboard shell. Deliberately minimal: one hero title, the globe, then the
 * ranked corridor list. Selection state (layer / window / rows / highlighted
 * corridor / rotation) is owned here and passed down; all labelling rules live
 * in the child components.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import CorridorList from "@/components/corridor-list";
import DemoBanner from "@/components/demo-banner";
import LayerSwitcher from "@/components/layer-switcher";
import LoadingState from "@/components/loading-state";
import RadarGlobe from "@/components/radar-globe";
import { RADAR_STATUS, useRadarData } from "@/hooks/use-radar-data";
import { buildArcs } from "@/lib/arcs";
import { formatRelativeTime } from "@/lib/format";
import {
  DEFAULT_LAYER,
  DEFAULT_LIMIT,
  DEFAULT_RANGE,
  DEFAULT_REFRESH_INTERVAL_MS,
  RADAR_API_DOCS_URL,
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

function Notice({ children }) {
  return (
    <p className="border-b border-white/[0.07] py-2.5 text-[11px] leading-relaxed text-amber-200/70">
      {children}
    </p>
  );
}

function UnavailablePanel({ error, onRetry }) {
  return (
    <div role="alert" className="py-12 text-center">
      <p className="text-sm text-rose-200/90">
        {error?.message ?? "Radar data is temporarily unavailable."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 text-xs text-white/40 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/80 focus-visible:text-white focus-visible:outline-none"
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
  return visible.map((warning) => <Notice key={warning.code}>{warning.message}</Notice>);
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

  const { status, data, corridors, warnings, error, lastSuccessAt, now, refresh } = radar;

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
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-16 pt-16 sm:pt-24">
        <header className="text-center">
          <h1 className="text-balance text-4xl font-medium tracking-tight text-[#F3F6FC] sm:text-6xl lg:text-7xl">
            Global DDoS Radar
          </h1>
        </header>

        <section aria-label="Attack activity globe" className="mt-10 sm:mt-14">
          <RadarGlobe
            arcs={arcs}
            autoRotate={!rotationPaused}
            reducedMotion={reducedMotion}
            className="h-[340px] w-full sm:h-[460px] lg:h-[560px]"
          />
        </section>

        {isDemo ? <DemoBanner /> : null}

        <div className="mx-auto mt-10 w-full max-w-3xl sm:mt-14">
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

          <div className="mt-5 border-t border-white/[0.07]">
            {showStaleNote ? (
              <Notice>
                Showing the last successful dataset
                {lastSuccessAt ? ` (${formatRelativeTime(lastSuccessAt, now)})` : ""} &mdash;
                latest refresh failed: {error.message}
              </Notice>
            ) : null}

            <WarningNotes warnings={warnings} />

            {status === RADAR_STATUS.LOADING ? (
              <LoadingState rows={limit > 10 ? 6 : limit} />
            ) : status === RADAR_STATUS.UNAVAILABLE ? (
              <UnavailablePanel error={error} onRetry={handleRefresh} />
            ) : (
              <CorridorList
                corridors={corridors}
                layer={layer}
                selectedRank={selectedRank}
                onSelect={onSelectCorridor}
              />
            )}
          </div>
        </div>

        <footer className="mt-auto pt-16 text-center text-[11px] text-white/25">
          <a
            href={RADAR_API_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white/50"
          >
            Cloudflare Radar
          </a>{" "}
          country-level aggregates &middot; not real-time
        </footer>
      </div>
    </div>
  );
}
