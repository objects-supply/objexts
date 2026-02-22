import type { Page } from "playwright";

// ─── Raw Product (scraped data before transformation) ─────────
export interface RawProduct {
  name: string;
  brand?: string;
  url?: string;
  description?: string;
  price?: string;
  currency?: string;
  category?: string;
  imageUrl?: string;
  attributes?: Record<string, string>;
}

// ─── Site Adapter Interface ───────────────────────────────────
export interface SiteAdapter {
  /** Human-readable name for logging */
  name: string;

  /** Returns true if this adapter should handle the given URL */
  matchesUrl: (url: string) => boolean;

  /** Extract product data from a rendered page */
  extractProducts: (page: Page) => Promise<RawProduct[]>;

  /** Discover product page links from a listing/category page */
  getProductLinks?: (page: Page) => Promise<string[]>;
}

// ─── Pipeline Options ─────────────────────────────────────────
export interface ScrapeOptions {
  /** URL to scrape */
  url?: string;

  /** Path to a file containing URLs (one per line) */
  file?: string;

  /** If true, treat the URL as a listing page and crawl for product links */
  crawl?: boolean;

  /** If true, print results without inserting into the database */
  dryRun?: boolean;

  /** If true, skip downloading and uploading images to storage */
  skipImages?: boolean;

  /** Delay between requests in milliseconds (default: 1500) */
  delay?: number;

  /** Maximum concurrent pages (default: 3) */
  concurrency?: number;

  /** Maximum number of products to scrape (default: unlimited) */
  limit?: number;
}

// ─── Pipeline Result ──────────────────────────────────────────
export interface ScrapeResult {
  inserted: number;
  skipped: number;
  errors: Array<{ url: string; error: string }>;
  products: RawProduct[];
}

// ─── Products Mode Options ────────────────────────────────────
export interface ProductsOptions {
  products?: string;
  productsFile?: string;
  dryRun?: boolean;
  skipImages?: boolean;
  delay?: number;
}

export interface ProductsResult {
  inserted: number;
  skipped: number;
  errors: Array<{ product: string; error: string }>;
}
