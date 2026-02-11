import { formatDistanceToNow } from "date-fns";

/**
 * Returns a human-readable relative time string like "a year ago", "3 months ago"
 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}
