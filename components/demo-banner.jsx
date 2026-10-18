/**
 * Demo-mode marker (PRD FR-08). Demo runs must be impossible to mistake for
 * live telemetry, but the marker stays a single quiet line.
 */
export default function DemoBanner() {
  return (
    <>
      <p
        role="note"
        aria-label="Demo mode notice"
        title="Sample corridors are shown for local development. No Cloudflare Radar request was made."
        className="mt-8 text-center font-mono text-[10px] tracking-[0.32em] text-violet-300/70"
      >
        DEMO DATA &mdash; NOT LIVE
      </p>
      <p className="sr-only">
        Sample corridors are shown for local development. No Cloudflare Radar request was made.
        Turn off the demo flag on the server and redeploy to use live telemetry.
      </p>
    </>
  );
}
