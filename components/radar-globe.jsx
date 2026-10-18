"use client";

/**
 * Dynamic, client-only wrapper around the installed Aceternity globe.
 *
 * - `next/dynamic` + `ssr: false` keeps Three.js/WebGL out of the server render.
 * - The component is memoized so a parent re-render (clock, status changes)
 *   never re-mounts the canvas; only a real `arcs` prop change reaches it.
 * - If WebGL is unavailable (or the globe throws), a quiet fallback keeps the
 *   rest of the dashboard useful.
 */
import dynamic from "next/dynamic";
import { Component, memo, useMemo, useSyncExternalStore } from "react";

const World = dynamic(
  () => import("@/components/ui/globe").then((mod) => mod.World),
  { ssr: false },
);

export const GLOBE_CONFIG = {
  pointSize: 4,
  globeColor: "#061535",
  showAtmosphere: true,
  atmosphereColor: "#38bdf8",
  atmosphereAltitude: 0.12,
  emissive: "#062056",
  emissiveIntensity: 0.22,
  shininess: 0.9,
  polygonColor: "rgba(125,211,252,0.5)",
  ambientLight: "#0ea5e9",
  directionalLeftLight: "#e0f2fe",
  directionalTopLight: "#bae6fd",
  pointLight: "#67e8f9",
  arcTime: 1700,
  arcLength: 0.85,
  rings: 1,
  maxRings: 2.6,
  initialPosition: { lat: 18, lng: 8 },
  autoRotate: true,
  autoRotateSpeed: 0.55,
  showRings: true,
};

class GlobeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn("[radar-globe] globe render failed:", error?.name ?? "Error");
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!context) return false;
    context.getExtension?.("WEBGL_lose_context")?.loseContext?.();
    return true;
  } catch {
    return false;
  }
}

/**
 * WebGL support is external state: probe once, cache the answer, and let
 * `useSyncExternalStore` own the server/browser snapshot split (server renders
 * the neutral loading state, then the client commits the real answer).
 */
let webglSupportCache = null;

function subscribeWebglSupport() {
  return () => {};
}

function getWebglSupportSnapshot() {
  if (webglSupportCache === null) webglSupportCache = supportsWebGL();
  return webglSupportCache;
}

function getWebglSupportServerSnapshot() {
  return null;
}

export function GlobeFallback({ message }) {
  return (
    <div
      role="img"
      aria-label="Globe preview unavailable"
      className="flex h-full w-full items-center justify-center"
    >
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-white/10 bg-[#080C14]/80 px-6 py-5 text-center">
        <div
          aria-hidden="true"
          className="h-20 w-20 rounded-full border border-cyan-400/30 bg-[radial-gradient(circle_at_35%_30%,rgba(56,189,248,0.25),rgba(6,21,53,0.9)_65%)]"
        />
        <p className="text-sm font-medium text-[#F3F6FC]">3D globe unavailable</p>
        <p className="text-xs leading-relaxed text-[#9BA7B8]">{message}</p>
      </div>
    </div>
  );
}

function RadarGlobe({ arcs, autoRotate = true, reducedMotion = false, className = "" }) {
  const webgl = useSyncExternalStore(
    subscribeWebglSupport,
    getWebglSupportSnapshot,
    getWebglSupportServerSnapshot,
  );

  const globeConfig = useMemo(
    () => ({
      ...GLOBE_CONFIG,
      autoRotate: autoRotate && !reducedMotion,
      showRings: !reducedMotion,
      arcTime: reducedMotion ? 0 : GLOBE_CONFIG.arcTime,
    }),
    [autoRotate, reducedMotion],
  );

  const safeArcs = useMemo(() => (Array.isArray(arcs) ? arcs : []), [arcs]);

  if (webgl === false) {
    return (
      <div className={className}>
        <GlobeFallback message="This browser could not start WebGL. Telemetry and the corridor list remain fully available." />
      </div>
    );
  }

  if (webgl === null) {
    return (
      <div className={className}>
        <GlobeFallback message="Preparing the globe view." />
      </div>
    );
  }

  return (
    <div className={className}>
      <GlobeErrorBoundary
        fallback={
          <GlobeFallback message="The globe view stopped unexpectedly. Telemetry and the corridor list remain fully available." />
        }
      >
        <World data={safeArcs} globeConfig={globeConfig} />
      </GlobeErrorBoundary>
    </div>
  );
}

export default memo(RadarGlobe);
