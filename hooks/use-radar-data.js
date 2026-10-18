"use client";

/**
 * Client-side radar data state machine.
 *
 * Guarantees (PRD FR-03, FR-05, FR-06, FR-07):
 * - Every rendered dataset belongs to the current `layer|range|limit` key, so a
 *   Layer 7 value can never remain displayed under a Layer 3 label.
 * - Requests never overlap: a new request for the same key is ignored while one
 *   is in flight, and a key change aborts the stale request.
 * - The last successful dataset per key is kept in memory; a later failure
 *   marks it stale instead of blanking the page.
 * - Polling is a display cadence only. It is paused while the tab is hidden and
 *   says nothing about how often Radar's upstream dataset changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDemoPayload,
  DEFAULT_LAYER,
  DEFAULT_LIMIT,
  DEFAULT_RANGE,
  DEFAULT_REFRESH_INTERVAL_MS,
  ERROR_CODES,
  ERROR_MESSAGES,
  MIN_REFRESH_INTERVAL_MS,
  STALE_AFTER_INTERVALS,
} from "@/lib/radar-config";

export const RADAR_STATUS = {
  LOADING: "loading",
  CONNECTED: "connected",
  STALE: "stale",
  UNAVAILABLE: "unavailable",
  DEMO: "demo",
};

function clampInterval(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_REFRESH_INTERVAL_MS) {
    return DEFAULT_REFRESH_INTERVAL_MS;
  }
  return parsed;
}

function paramsFromKey(key) {
  const [layer, range, limit] = key.split("|");
  return { layer, range, limit };
}

function requestUrl(key) {
  const { layer, range, limit } = paramsFromKey(key);
  const params = new URLSearchParams({ layer, range, limit });
  return `/api/radar?${params.toString()}`;
}

function clientError(res, body) {
  const code = body?.error?.code ?? (res.status === 429 ? ERROR_CODES.UPSTREAM_RATE_LIMIT : ERROR_CODES.UNKNOWN);
  const message =
    typeof body?.error?.message === "string" && body.error.message.trim() !== ""
      ? body.error.message
      : ERROR_MESSAGES[code] ?? ERROR_MESSAGES[ERROR_CODES.UNKNOWN];
  return { code, message, status: res.status, at: Date.now() };
}

export function useRadarData({
  layer = DEFAULT_LAYER,
  range = DEFAULT_RANGE,
  limit = DEFAULT_LIMIT,
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
  demoMode = false,
} = {}) {
  const key = `${layer}|${range}|${limit}`;
  const interval = clampInterval(refreshIntervalMs);
  const freshnessMs = interval * STALE_AFTER_INTERVALS;

  const cacheRef = useRef(new Map());
  const inFlightRef = useRef(null);
  const [state, setState] = useState({
    key: null,
    data: null,
    error: null,
    receivedAt: null,
    fetching: false,
  });
  // 0 until mounted: reading the clock during prerender is not allowed under
  // Cache Components, and no relative time is rendered before data exists.
  const [now, setNow] = useState(0);

  const runFetch = useCallback(
    async (targetKey, reason) => {
      const existing = inFlightRef.current;
      if (existing) {
        if (existing.key === targetKey) return; // prevent overlapping requests
        existing.controller.abort(); // selection changed: cancel the stale call
      }

      const controller = new AbortController();
      inFlightRef.current = { key: targetKey, controller, reason };

      const cached = cacheRef.current.get(targetKey);
      setState((prev) => {
        const keep = prev.key === targetKey;
        return {
          key: targetKey,
          data: cached?.payload ?? (keep ? prev.data : null),
          receivedAt: cached?.receivedAt ?? (keep ? prev.receivedAt : null),
          error: keep ? prev.error : null,
          fetching: true,
        };
      });

      try {
        const response = await fetch(requestUrl(targetKey), {
          signal: controller.signal,
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body || body.success !== true) {
          const failure = clientError(response, body);
          const error = new Error(failure.message);
          error.code = failure.code;
          error.status = failure.status;
          throw error;
        }
        const receivedAt = Date.now();
        cacheRef.current.set(targetKey, { payload: body, receivedAt });
        setNow(receivedAt);
        setState((prev) =>
          prev.key === targetKey
            ? { key: targetKey, data: body, receivedAt, error: null, fetching: false }
            : prev,
        );
      } catch (error) {
        if (error?.name === "AbortError") return;
        const failure = {
          code: error?.code ?? ERROR_CODES.UNKNOWN,
          message: error?.message ?? ERROR_MESSAGES[ERROR_CODES.UNKNOWN],
          status: error?.status ?? null,
          at: Date.now(),
        };
        setState((prev) => (prev.key === targetKey ? { ...prev, error: failure, fetching: false } : prev));
      } finally {
        if (inFlightRef.current?.controller === controller) inFlightRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (demoMode) {
      inFlightRef.current?.controller.abort();
      inFlightRef.current = null;
      return undefined;
    }
    runFetch(key, "load");
    return () => {
      inFlightRef.current?.controller.abort();
      inFlightRef.current = null;
    };
  }, [key, demoMode, runFetch]);

  useEffect(() => {
    if (demoMode) return undefined;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      runFetch(key, "poll");
    }, interval);
    return () => clearInterval(id);
  }, [key, demoMode, interval, runFetch]);

  // Ages relative timestamps without re-rendering for any other reason. The
  // initial value is 0 so nothing time-dependent is produced during prerender;
  // the first successful fetch seeds it.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(() => {
    if (demoMode) return;
    if (inFlightRef.current?.key === key) return; // ignore duplicate manual presses
    runFetch(key, "manual");
  }, [key, demoMode, runFetch]);

  const demoPayload = useMemo(
    () => (demoMode ? buildDemoPayload({ layer, range }) : null),
    [demoMode, layer, range],
  );

  const isCurrent = state.key === key;
  const liveData = isCurrent ? state.data : null;
  const receivedAt = isCurrent ? state.receivedAt : null;
  const error = isCurrent ? state.error : null;
  const fetching = !isCurrent || state.fetching;
  const data = demoMode ? demoPayload : liveData;

  let status = RADAR_STATUS.LOADING;
  if (demoMode) {
    status = RADAR_STATUS.DEMO;
  } else if (!liveData && !error) {
    status = RADAR_STATUS.LOADING;
  } else if (!liveData) {
    status = RADAR_STATUS.UNAVAILABLE;
  } else if (error || (receivedAt !== null && now - receivedAt > freshnessMs)) {
    status = RADAR_STATUS.STALE;
  } else {
    status = RADAR_STATUS.CONNECTED;
  }

  return {
    status,
    data,
    corridors: data?.corridors ?? [],
    metric: data?.metric ?? null,
    dateRange: data?.dateRange ?? null,
    warnings: data?.warnings ?? [],
    upstreamLastUpdated: data?.upstreamLastUpdated ?? null,
    lastSuccessAt: demoMode ? null : receivedAt,
    error: demoMode ? null : error,
    isRefreshing: !demoMode && fetching && Boolean(liveData),
    refresh,
    now,
  };
}
