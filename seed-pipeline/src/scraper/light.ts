import * as cheerio from "cheerio";
import type { RawProduct } from "../adapters/types.js";
import { log } from "../utils.js";

/**
 * Light scraper: fetches HTML and extracts JSON-LD structured data.
 * No browser needed — just HTTP fetch + cheerio parsing.
 *
 * This is the primary extraction method and works on most major retailers
 * that embed Schema.org Product markup.
 */
export async function lightScrape(url: string): Promise<RawProduct[]> {
  log("debug", `Light scraping: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    log("warn", `HTTP ${response.status} for ${url}`);
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const products: RawProduct[] = [];

  // Find all JSON-LD script tags
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const text = $(el).html();
      if (!text) return;

      const data = JSON.parse(text);
      const items = extractProductsFromJsonLd(data, url);
      products.push(...items);
    } catch (err) {
      log("debug", `Failed to parse JSON-LD block: ${err}`);
    }
  });

  // If no JSON-LD products found, try Open Graph / meta tags as a lighter fallback
  if (products.length === 0) {
    const metaProduct = extractFromMeta($, url);
    if (metaProduct) {
      products.push(metaProduct);
    }
  }

  log("debug", `Light scrape found ${products.length} product(s) from ${url}`);
  return products;
}

// ─── JSON-LD Extraction ───────────────────────────────────────

/**
 * Recursively extract Product entries from JSON-LD data.
 * Handles nested structures, @graph arrays, and ItemList patterns.
 */
function extractProductsFromJsonLd(
  data: unknown,
  pageUrl: string
): RawProduct[] {
  if (!data || typeof data !== "object") return [];

  // Handle arrays (including @graph)
  if (Array.isArray(data)) {
    return data.flatMap((item) => extractProductsFromJsonLd(item, pageUrl));
  }

  const obj = data as Record<string, unknown>;

  // If this is a @graph container, recurse into it
  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    return extractProductsFromJsonLd(obj["@graph"], pageUrl);
  }

  // If this is an ItemList, extract from listElement
  if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
    return (obj.itemListElement as Record<string, unknown>[]).flatMap((item) => {
      const nested = item.item ?? item;
      return extractProductsFromJsonLd(nested, pageUrl);
    });
  }

  // Check if this is a Product
  const type = obj["@type"];
  const isProduct =
    type === "Product" ||
    (Array.isArray(type) && type.includes("Product"));

  if (!isProduct) return [];

  return [jsonLdToRawProduct(obj, pageUrl)];
}

/**
 * Convert a Schema.org Product JSON-LD object to a RawProduct.
 */
function jsonLdToRawProduct(
  product: Record<string, unknown>,
  pageUrl: string
): RawProduct {
  // Extract brand
  let brand: string | undefined;
  if (typeof product.brand === "string") {
    brand = product.brand;
  } else if (product.brand && typeof product.brand === "object") {
    brand = (product.brand as Record<string, unknown>).name as string;
  }

  // Extract price from offers
  let price: string | undefined;
  let currency: string | undefined;
  const offers = product.offers;

  if (offers) {
    const offerObj = Array.isArray(offers) ? offers[0] : offers;
    if (typeof offerObj === "object" && offerObj !== null) {
      const o = offerObj as Record<string, unknown>;
      price =
        (o.price as string) ??
        (o.lowPrice as string) ??
        (o.highPrice as string);
      currency = o.priceCurrency as string;

      // price might be a number
      if (typeof price === "number") price = String(price);
    }
  }

  // Extract category
  let category: string | undefined;
  if (typeof product.category === "string") {
    category = product.category;
  } else if (Array.isArray(product.category)) {
    category = product.category.join(" > ");
  }

  // Extract description
  let description = product.description as string | undefined;
  if (description && description.length > 500) {
    description = description.slice(0, 497) + "...";
  }

  // Extract image
  let imageUrl: string | undefined;
  if (typeof product.image === "string") {
    imageUrl = product.image;
  } else if (Array.isArray(product.image) && product.image.length > 0) {
    imageUrl =
      typeof product.image[0] === "string"
        ? product.image[0]
        : (product.image[0] as Record<string, unknown>)?.url as string;
  } else if (product.image && typeof product.image === "object") {
    imageUrl = (product.image as Record<string, unknown>).url as string;
  }

  // Extract extra attributes into custom fields
  const attributes: Record<string, string> = {};
  const knownKeys = new Set([
    "@context", "@type", "@id", "name", "brand", "offers", "description",
    "image", "url", "category", "sku", "gtin", "gtin13", "gtin14",
    "gtin8", "mpn", "model", "color", "material", "size", "weight",
    "aggregateRating", "review",
  ]);

  // Pull specific useful attributes
  if (product.sku) attributes.sku = String(product.sku);
  if (product.gtin13) attributes.gtin = String(product.gtin13);
  if (product.gtin) attributes.gtin = String(product.gtin);
  if (product.mpn) attributes.mpn = String(product.mpn);
  if (product.model) attributes.model = String(product.model);
  if (product.color) attributes.color = String(product.color);
  if (product.material) attributes.material = String(product.material);

  // Grab any remaining simple string/number fields
  for (const [key, value] of Object.entries(product)) {
    if (knownKeys.has(key)) continue;
    if (typeof value === "string" || typeof value === "number") {
      attributes[key] = String(value);
    }
  }

  return {
    name: (product.name as string) ?? "Unknown Product",
    brand,
    url: (product.url as string) ?? pageUrl,
    description,
    price,
    currency,
    category,
    imageUrl,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  };
}

// ─── Meta Tag Fallback ────────────────────────────────────────

/**
 * Extract basic product info from Open Graph and standard meta tags.
 * Used when no JSON-LD is present.
 */
function extractFromMeta(
  $: cheerio.CheerioAPI,
  pageUrl: string
): RawProduct | null {
  const getMeta = (names: string[]): string | undefined => {
    for (const name of names) {
      const content =
        $(`meta[property="${name}"]`).attr("content") ??
        $(`meta[name="${name}"]`).attr("content");
      if (content?.trim()) return content.trim();
    }
    return undefined;
  };

  const name =
    getMeta(["og:title", "twitter:title"]) ?? $("title").text().trim();

  if (!name) return null;

  const description = getMeta([
    "og:description",
    "description",
    "twitter:description",
  ]);

  const price = getMeta(["product:price:amount"]);
  const brand = getMeta(["product:brand"]);
  const imageUrl = getMeta(["og:image", "twitter:image"]);

  // Only return if we have at least a name - meta-only extraction is low confidence
  return {
    name,
    brand,
    url: getMeta(["og:url"]) ?? pageUrl,
    description: description?.slice(0, 500),
    price,
    imageUrl,
  };
}
