"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { offeredObjects } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────

interface SeedResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: Array<{ url: string; error: string }>;
  products: Array<{
    name: string;
    brand?: string;
    price?: string;
    category?: string;
    status: "inserted" | "skipped" | "error";
  }>;
}

interface RawProduct {
  name: string;
  brand?: string;
  url?: string;
  description?: string;
  price?: string;
  category?: string;
  attributes?: Record<string, string>;
}

// ─── Auth Check ───────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

// ─── Light Scrape (inline, no Playwright dependency) ──────────

/**
 * Server-side light scraper: fetch HTML and extract JSON-LD Product data.
 * This is a simplified version of the full pipeline's light scraper,
 * designed to work within a Next.js server action without Playwright.
 */
async function lightScrapeUrl(url: string): Promise<RawProduct[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const products: RawProduct[] = [];

  // Extract JSON-LD blocks using regex (avoid cheerio dependency in main app)
  const jsonLdRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const extracted = extractProducts(data, url);
      products.push(...extracted);
    } catch {
      // skip malformed JSON-LD
    }
  }

  return products;
}

function extractProducts(data: unknown, pageUrl: string): RawProduct[] {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data)) return data.flatMap((d) => extractProducts(d, pageUrl));

  const obj = data as Record<string, unknown>;

  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    return extractProducts(obj["@graph"], pageUrl);
  }

  const type = obj["@type"];
  const isProduct =
    type === "Product" || (Array.isArray(type) && type.includes("Product"));

  if (!isProduct) return [];

  // Extract brand
  let brand: string | undefined;
  if (typeof obj.brand === "string") brand = obj.brand;
  else if (obj.brand && typeof obj.brand === "object")
    brand = (obj.brand as Record<string, unknown>).name as string;

  // Extract price
  let price: string | undefined;
  const offers = obj.offers;
  if (offers) {
    const offer = Array.isArray(offers) ? offers[0] : offers;
    if (typeof offer === "object" && offer !== null) {
      const o = offer as Record<string, unknown>;
      const p = o.price ?? o.lowPrice;
      price = typeof p === "number" ? String(p) : (p as string);
    }
  }

  // Extract category
  let category: string | undefined;
  if (typeof obj.category === "string") category = obj.category;

  // Description
  let description = obj.description as string | undefined;
  if (description && description.length > 500) description = description.slice(0, 497) + "...";

  // Extra attributes
  const attributes: Record<string, string> = {};
  if (obj.sku) attributes.sku = String(obj.sku);
  if (obj.color) attributes.color = String(obj.color);
  if (obj.material) attributes.material = String(obj.material);
  if (obj.model) attributes.model = String(obj.model);

  return [
    {
      name: (obj.name as string) ?? "Unknown Product",
      brand,
      url: (obj.url as string) ?? pageUrl,
      description,
      price,
      category,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    },
  ];
}

// ─── Database Operations ──────────────────────────────────────

async function productExists(name: string, brandName: string | null) {
  const conditions = brandName
    ? and(eq(offeredObjects.name, name), eq(offeredObjects.brandName, brandName))
    : and(eq(offeredObjects.name, name), sql`${offeredObjects.brandName} IS NULL`);

  const existing = await db
    .select({ id: offeredObjects.id })
    .from(offeredObjects)
    .where(conditions!)
    .limit(1);

  return existing.length > 0;
}

// ─── Server Action ────────────────────────────────────────────

/**
 * Scrape product data from the given URLs and insert into offered_objects.
 * Uses light scraping only (JSON-LD extraction) since Playwright
 * cannot run inside a Next.js server action.
 *
 * For full scraping (including DOM extraction), use the CLI pipeline.
 */
export async function scrapeAndSeed(urls: string[]): Promise<SeedResult> {
  await requireAuth();

  const result: SeedResult = {
    success: true,
    inserted: 0,
    skipped: 0,
    errors: [],
    products: [],
  };

  for (const url of urls) {
    try {
      const products = await lightScrapeUrl(url.trim());

      if (products.length === 0) {
        result.errors.push({ url, error: "No products found (no JSON-LD data)" });
        continue;
      }

      for (const product of products) {
        const exists = await productExists(
          product.name,
          product.brand ?? null
        );

        if (exists) {
          result.skipped++;
          result.products.push({
            name: product.name,
            brand: product.brand,
            price: product.price,
            category: product.category,
            status: "skipped",
          });
          continue;
        }

        // Clean price
        let cleanPrice: string | undefined;
        if (product.price) {
          const num = parseFloat(product.price.replace(/[^0-9.]/g, ""));
          if (!isNaN(num)) cleanPrice = num.toFixed(2);
        }

        await db.insert(offeredObjects).values({
          name: product.name,
          brandName: product.brand ?? null,
          productUrl: product.url ?? url,
          category: product.category ?? null,
          description: product.description ?? null,
          defaultPrice: cleanPrice ?? undefined,
          customFields:
            product.attributes && Object.keys(product.attributes).length > 0
              ? product.attributes
              : null,
          isActive: true,
        });

        result.inserted++;
        result.products.push({
          name: product.name,
          brand: product.brand,
          price: cleanPrice,
          category: product.category,
          status: "inserted",
        });
      }
    } catch (err) {
      result.errors.push({
        url,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  result.success = result.errors.length === 0;
  return result;
}
