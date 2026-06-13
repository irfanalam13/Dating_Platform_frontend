export function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

/** The wall-clock time of day, e.g. "3:14 PM" / "8:05 AM". */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Relative label plus the real clock time, e.g. "8h ago · 3:14 PM" or
 * "Wed · 8:05 AM". Used where the exact time matters (notifications).
 */
export function formatTimeWithClock(iso: string): string {
  return `${formatTime(iso)} · ${formatClock(iso)}`;
}