import type { ScrapeOptions, ScrapeResult, RawProduct, SiteAdapter } from "./adapters/types.js";
import { genericAdapter } from "./adapters/generic.js";
import { lightScrape } from "./scraper/light.js";
import { heavyScrape, crawlProductLinks, closeBrowser } from "./scraper/heavy.js";
import { validateProducts } from "./validator.js";
import { transformProducts } from "./transformer.js";
import { upsertProducts, dryRunProducts, closeDb } from "./db.js";
import { log, normalizeUrl, processWithConcurrency } from "./utils.js";
import { readFileSync } from "node:fs";

// ─── Default Configuration ────────────────────────────────────

const DEFAULTS = {
  delay: 1500,
  concurrency: 3,
} as const;

// ─── Pipeline ─────────────────────────────────────────────────

/**
 * Run the full scraping pipeline.
 *
 * 1. Collect URLs (from --url, --file, or --crawl)
 * 2. Scrape each URL (light first, heavy fallback)
 * 3. Validate and transform
 * 4. Insert into database (or dry run)
 */
export async function runPipeline(
  options: ScrapeOptions,
  adapters: SiteAdapter[] = [genericAdapter]
): Promise<ScrapeResult> {
  const delay = options.delay ?? DEFAULTS.delay;
  const concurrency = options.concurrency ?? DEFAULTS.concurrency;

  const result: ScrapeResult = {
    inserted: 0,
    skipped: 0,
    errors: [],
    products: [],
  };

  try {
    // Step 1: Collect URLs
    let urls = collectUrls(options);

    if (urls.length === 0) {
      log("error", "No URLs to scrape. Provide --url or --file.");
      return result;
    }

    // Step 2: If crawl mode, discover product links from listing pages
    if (options.crawl) {
      log("info", `Crawl mode: discovering product links from ${urls.length} listing page(s)...`);
      const discoveredUrls: string[] = [];

      for (const url of urls) {
        const links = await crawlProductLinks(url, adapters);
        discoveredUrls.push(...links);
      }

      // Deduplicate and normalize
      urls = [...new Set(discoveredUrls.map(normalizeUrl))];
      log("info", `Discovered ${urls.length} unique product URLs`);
    }

    // Apply limit if set
    if (options.limit && urls.length > options.limit) {
      log("info", `Limiting to ${options.limit} of ${urls.length} URLs`);
      urls = urls.slice(0, options.limit);
    }

    log("info", `Scraping ${urls.length} URL(s) (concurrency: ${concurrency}, delay: ${delay}ms)`);

    // Step 3: Scrape each URL
    const allProducts: RawProduct[] = [];

    await processWithConcurrency(urls, concurrency, delay, async (url, idx) => {
      log("info", `[${idx + 1}/${urls.length}] Scraping: ${url}`);

      try {
        // Try light scrape first
        let products = await lightScrape(url);

        // Fall back to heavy scrape if nothing found
        if (products.length === 0) {
          log("debug", `No JSON-LD found, falling back to heavy scrape: ${url}`);
          products = await heavyScrape(url, adapters);
        }

        if (products.length === 0) {
          log("warn", `No products found on: ${url}`);
          result.errors.push({ url, error: "No products found" });
        } else {
          allProducts.push(...products);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        log("error", `Failed to scrape ${url}: ${errorMsg}`);
        result.errors.push({ url, error: errorMsg });
      }
    });

    if (allProducts.length === 0) {
      log("warn", "No products scraped from any URL.");
      return result;
    }

    // Step 4: Validate
    const validated = validateProducts(allProducts);

    if (validated.length === 0) {
      log("warn", "All products failed validation.");
      return result;
    }

    // Step 5: Transform
    const transformed = transformProducts(validated);
    result.products = allProducts;

    // Step 6: Insert or dry run
    if (options.dryRun) {
      log("info", "=== DRY RUN MODE ===");
      const dryResult = await dryRunProducts(transformed);
      result.inserted = dryResult.wouldInsert;
      result.skipped = dryResult.wouldSkip;
    } else {
      const dbResult = await upsertProducts(transformed);
      result.inserted = dbResult.inserted;
      result.skipped = dbResult.skipped;
    }

    // Summary
    log("success", "─── Pipeline Complete ───");
    log("info", `  URLs processed: ${urls.length}`);
    log("info", `  Products found: ${allProducts.length}`);
    log("info", `  Validated:      ${validated.length}`);
    log("info", `  Inserted:       ${result.inserted}`);
    log("info", `  Skipped:        ${result.skipped}`);
    log("info", `  Errors:         ${result.errors.length}`);

    return result;
  } finally {
    await closeBrowser();
    await closeDb();
  }
}

// ─── URL Collection ───────────────────────────────────────────

function collectUrls(options: ScrapeOptions): string[] {
  const urls: string[] = [];

  if (options.url) {
    urls.push(normalizeUrl(options.url));
  }

  if (options.file) {
    try {
      const content = readFileSync(options.file, "utf-8");
      const fileUrls = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));

      urls.push(...fileUrls.map(normalizeUrl));
      log("info", `Loaded ${fileUrls.length} URL(s) from ${options.file}`);
    } catch (err) {
      log("error", `Failed to read URL file: ${options.file}`, err);
    }
  }

  // Deduplicate
  return [...new Set(urls)];
}
