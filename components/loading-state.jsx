/**
 * Loading skeleton for the corridor list. `animate-pulse` is motion-safe only,
 * and the whole block announces through `role="status"`.
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
    <div role="status" data-testid="loading-state">
      <ul className="divide-y divide-white/[0.07]">
        {Array.from({ length: rows }).map((_, index) => (
          <li key={index} className="flex items-center gap-4 py-3">
            <SkeletonLine className="h-3 w-6 shrink-0" />
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-3 w-10 shrink-0" />
          </li>
        ))}
      </ul>
      <span className="sr-only">{label}</span>
    </div>
  );
}
