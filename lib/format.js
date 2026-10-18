/**
 * Formatting helpers.
 *
 * All absolute timestamps render in UTC with an explicit timezone label so the
 * server-rendered and client-rendered markup cannot disagree, and so a global
 * audience reads one unambiguous clock.
 */

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function toEpoch(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** "18 Oct 2026, 12:04 UTC" or null when the input is not a valid timestamp. */
export function formatUtcTimestamp(value) {
  const epoch = toEpoch(value);
  if (epoch === null) return null;
  return `${DATE_TIME_FORMATTER.format(new Date(epoch))} UTC`;
}

/** "just now" / "4 min ago" / "3 h ago" / "2 d ago". */
export function formatRelativeTime(value, now = Date.now()) {
  const epoch = toEpoch(value);
  if (epoch === null) return null;
  const delta = Math.max(0, now - epoch);
  if (delta < 45 * 1000) return "just now";
  if (delta < HOUR) return `${Math.round(delta / MINUTE)} min ago`;
  if (delta < DAY) return `${Math.round(delta / HOUR)} h ago`;
  return `${Math.round(delta / DAY)} d ago`;
}

export function formatTimestampWithAge(value, now = Date.now()) {
  const absolute = formatUtcTimestamp(value);
  if (!absolute) return null;
  const relative = formatRelativeTime(value, now);
  return relative ? { absolute, relative } : { absolute, relative: null };
}
