// ─── Logging ──────────────────────────────────────────────────

type LogLevel = "info" | "warn" | "error" | "success" | "debug";

const LOG_COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",    // cyan
  warn: "\x1b[33m",    // yellow
  error: "\x1b[31m",   // red
  success: "\x1b[32m", // green
  debug: "\x1b[90m",   // gray
};

const RESET = "\x1b[0m";

export function log(level: LogLevel, message: string, ...args: unknown[]) {
  const color = LOG_COLORS[level];
  const prefix = level.toUpperCase().padEnd(7);
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`${color}[${timestamp}] ${prefix}${RESET} ${message}`, ...args);
}

// ─── Rate Limiting ────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process items with concurrency limit and delay between each.
 */
export async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  delay: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      try {
        const result = await fn(item, currentIndex);
        results[currentIndex] = result;
      } catch (err) {
        log("error", `Failed processing item ${currentIndex}:`, err);
        results[currentIndex] = undefined as unknown as R;
      }
      if (delay > 0 && index < items.length) {
        await sleep(delay);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

// ─── URL Helpers ──────────────────────────────────────────────

/**
 * Normalize a URL by removing tracking params, fragments, etc.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // Remove common tracking parameters
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "ref_", "tag", "fbclid", "gclid",
    ];
    trackingParams.forEach((p) => url.searchParams.delete(p));
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Check if two URLs point to the same domain.
 */
export function isSameDomain(url1: string, url2: string): boolean {
  try {
    return new URL(url1).hostname === new URL(url2).hostname;
  } catch {
    return false;
  }
}
