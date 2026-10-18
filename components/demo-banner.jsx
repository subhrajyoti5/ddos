/**
 * Persistent demo-mode banner (PRD FR-08). Demo runs must be impossible to
 * mistake for live telemetry: the banner cannot be dismissed, and it states
 * exactly what is being shown and how to leave demo mode.
 */
import { IconFlask } from "@/components/icons";

export default function DemoBanner() {
  return (
    <div
      role="note"
      aria-label="Demo mode notice"
      className="flex items-start gap-3 rounded-lg border border-violet-400/40 bg-violet-500/[0.08] px-4 py-3"
    >
      <IconFlask className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
      <div className="min-w-0 text-xs leading-relaxed">
        <p className="font-semibold tracking-wide text-violet-100">DEMO DATA &mdash; NOT LIVE</p>
        <p className="text-violet-200/80">
          Sample corridors are shown for local development. No Cloudflare Radar request was made.
          Turn off the demo flag on the server (and redeploy) to use live telemetry.
        </p>
      </div>
    </div>
  );
}
