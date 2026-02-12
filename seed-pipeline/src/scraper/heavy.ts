import { chromium, type Browser, type Page } from "playwright";
import type { SiteAdapter, RawProduct } from "../adapters/types.js";
import { genericAdapter } from "../adapters/generic.js";
import { log } from "../utils.js";

let browser: Browser | null = null;

/**
 * Get or create a shared browser instance.
 */
async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    log("debug", "Launching browser...");
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browser;
}

/**
 * Close the shared browser instance.
 */
export async function closeBrowser(): Promise<void> {
  if (browser?.isConnected()) {
    await browser.close();
    browser = null;
    log("debug", "Browser closed");
  }
}

/**
 * Heavy scraper: renders pages in a real browser using Playwright,
 * then runs a site adapter to extract product data from the DOM.
 *
 * This is the fallback when the light scraper (JSON-LD) finds nothing.
 */
export async function heavyScrape(
  url: string,
  adapters: SiteAdapter[] = [genericAdapter]
): Promise<RawProduct[]> {
  log("debug", `Heavy scraping: ${url}`);

  const instance = await getBrowser();
  const page = await instance.newPage();

  try {
    // Set a reasonable viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate and wait for the page to settle
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Wait a bit for dynamic content to render
    await page.waitForTimeout(2000);

    // Find the matching adapter
    const adapter = adapters.find((a) => a.matchesUrl(url)) ?? genericAdapter;
    log("debug", `Using adapter: ${adapter.name}`);

    const products = await adapter.extractProducts(page);
    log("debug", `Heavy scrape found ${products.length} product(s) from ${url}`);

    return products;
  } catch (err) {
    log("error", `Heavy scrape failed for ${url}:`, err);
    return [];
  } finally {
    await page.close();
  }
}

/**
 * Crawl a listing page to discover product links.
 * Uses the adapter's getProductLinks method, or the generic adapter's.
 */
export async function crawlProductLinks(
  url: string,
  adapters: SiteAdapter[] = [genericAdapter]
): Promise<string[]> {
  log("info", `Crawling for product links: ${url}`);

  const instance = await getBrowser();
  const page = await instance.newPage();

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(2000);

    const adapter = adapters.find((a) => a.matchesUrl(url)) ?? genericAdapter;

    if (!adapter.getProductLinks) {
      log("warn", `Adapter ${adapter.name} does not support link discovery`);
      return [];
    }

    const links = await adapter.getProductLinks(page);
    const uniqueLinks = [...new Set(links)];

    log("info", `Found ${uniqueLinks.length} product link(s)`);
    return uniqueLinks;
  } catch (err) {
    log("error", `Crawl failed for ${url}:`, err);
    return [];
  } finally {
    await page.close();
  }
}
