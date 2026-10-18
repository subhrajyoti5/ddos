/**
 * Loading skeleton for the corridor panel and telemetry strip. `animate-pulse`
 * is motion-safe only, and the whole block announces through `role="status"`.
 */
export function SkeletonLine({ className = "h-4 w-full" }) {
  return (
    <div
      className={`rounded bg-white/[0.06] motion-safe:animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

export default function LoadingState({ label = "Loading radar data\u2026", rows = 5 }) {
  return (
    <div role="status" className="flex flex-col gap-3" data-testid="loading-state">
      <div className="flex items-center justify-between gap-4">
        <SkeletonLine className="h-3 w-32" />
        <SkeletonLine className="h-3 w-16" />
      </div>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, index) => (
          <li key={index} className="flex items-center gap-3 rounded-md border border-white/[0.06] px-3 py-2.5">
            <SkeletonLine className="h-6 w-6 shrink-0" />
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-12 shrink-0" />
          </li>
        ))}
      </ul>
      <span className="sr-only">{label}</span>
    </div>
  );
}
