import type { ScrapeOptions, ScrapeResult, RawProduct, SiteAdapter, ProductsOptions, ProductsResult } from "./adapters/types.js";
import { genericAdapter } from "./adapters/generic.js";
import { lightScrape } from "./scraper/light.js";
import { heavyScrape, crawlProductLinks, closeBrowser } from "./scraper/heavy.js";
import { validateProducts } from "./validator.js";
import { transformProducts } from "./transformer.js";
import { upsertProducts, dryRunProducts, closeDb, upsertProduct, dryRunProduct, checkProductExists, updateProductImage } from "./db.js";
import { downloadImagesForProducts, applyImageUrls, downloadAndUploadImage } from "./image-downloader.js";
import { log, normalizeUrl, processWithConcurrency } from "./utils.js";
import { searchProductImagesWithDelay, closeDdgsService } from "./search.js";
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
    let validated = validateProducts(allProducts);

    if (validated.length === 0) {
      log("warn", "All products failed validation.");
      return result;
    }

    // Step 5: Download and upload images (unless skipped)
    if (!options.skipImages) {
      const imageMap = await downloadImagesForProducts(validated, concurrency, delay);
      validated = applyImageUrls(validated, imageMap);
    } else {
      log("info", "Skipping image downloads (--skip-images)");
    }

    // Step 6: Transform
    const transformed = transformProducts(validated);
    result.products = allProducts;

    // Step 7: Insert or dry run
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

// ─── Products Pipeline (Name + Brand Search Mode) ─────────────

interface ParsedProduct {
  name: string;
  brand: string | null;
  color: string | null;
}

const KNOWN_BRANDS = [
  "Apple", "Sony", "Samsung", "Google", "Microsoft", "Amazon", "Kindle",
  "Nalgene", "Hydro Flask", "Stanley", "Yeti", "Contigo", "CamelBak",
  "Nike", "Adidas", "Puma", "New Balance", "Asics", "Reebok", "Under Armour",
  "Patagonia", "North Face", "Arc'teryx", "Columbia", "REI",
  "Dyson", "Roomba", "iRobot", "Shark", "Bissell",
  "Aesop", "Glossier", "Drunk Elephant", "The Ordinary", "CeraVe",
  "Muji", "IKEA", "Herman Miller", "Steelcase",
  "Bose", "JBL", "Sennheiser", "Audio-Technica", "Shure", "Beats",
  "Canon", "Nikon", "Sony", "Fujifilm", "Leica", "GoPro",
  "KitchenAid", "Cuisinart", "Le Creuset", "Staub", "Lodge", "All-Clad",
  "Moleskine", "Leuchtturm", "Field Notes", "Rhodia",
  "Lamy", "Pilot", "Uni", "Pentel", "Zebra", "Rotring",
  "Birkenstock", "Clarks", "Dr. Martens", "Blundstone", "Converse", "Vans",
  "Osprey", "Fjällräven", "Herschel", "Tumi", "Away",
  "Anker", "Belkin", "Logitech", "Razer", "SteelSeries",
  "Dell", "HP", "Lenovo", "ASUS", "Acer", "MSI",
  "LG", "Philips", "Panasonic", "Sharp", "Vizio",
  "Braun", "Oral-B", "Philips Sonicare", "Waterpik",
  "Weber", "Traeger", "Big Green Egg", "Char-Broil",
  "Lego", "Nintendo", "PlayStation", "Xbox",
  "Garmin", "Fitbit", "Whoop", "Oura",
  "Rimowa", "Samsonite", "Briggs & Riley",
];

const KNOWN_COLORS = [
  "black", "white", "gray", "grey", "silver", "gold", "rose gold",
  "red", "blue", "green", "yellow", "orange", "purple", "pink",
  "navy", "teal", "turquoise", "cyan", "magenta", "maroon", "burgundy",
  "beige", "tan", "brown", "cream", "ivory", "khaki", "olive",
  "coral", "salmon", "lavender", "mint", "sage", "forest green",
  "sky blue", "royal blue", "midnight blue", "slate", "charcoal",
  "graphite", "space gray", "space grey", "starlight", "midnight",
];

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractColor(input: string): { text: string; color: string | null } {
  const inputLower = input.toLowerCase();
  let foundColor: string | null = null;
  let colorIndex = -1;
  let colorLength = 0;
  for (const color of KNOWN_COLORS) {
    const regex = new RegExp(`\\b${color}\\b`, "i");
    const match = inputLower.match(regex);
    if (match && match.index !== undefined) {
      if (!foundColor || color.length > colorLength) {
        foundColor = color;
        colorIndex = match.index;
        colorLength = color.length;
      }
    }
  }
  if (foundColor && colorIndex !== -1) {
    const before = input.slice(0, colorIndex).trim();
    const after = input.slice(colorIndex + colorLength).trim();
    const text = [before, after].filter(Boolean).join(" ").trim();
    return { text, color: titleCase(foundColor) };
  }
  return { text: input, color: null };
}

function parseNaturalProduct(input: string): ParsedProduct {
  const inputLower = input.toLowerCase();
  let foundBrand: string | null = null;
  let brandIndex = -1;
  let brandLength = 0;
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i");
    const match = inputLower.match(regex);
    if (match && match.index !== undefined) {
      if (!foundBrand || brand.length > brandLength) {
        foundBrand = brand;
        brandIndex = match.index;
        brandLength = brand.length;
      }
    }
  }
  let remainingText = input;
  if (foundBrand && brandIndex !== -1) {
    const before = input.slice(0, brandIndex).trim();
    const after = input.slice(brandIndex + brandLength).trim();
    remainingText = [before, after].filter(Boolean).join(" ").trim();
  }
  const { text: nameText, color } = extractColor(remainingText);
  const name = titleCase(nameText || input);
  return { name, brand: foundBrand, color };
}

function parseProductEntry(entry: string): ParsedProduct {
  if (entry.includes(",")) {
    const parts = entry.split(",").map((s) => s.trim());
    const name = titleCase(parts[0]);
    const brand = parts[1] ? titleCase(parts[1]) : null;
    const { text: cleanName, color } = extractColor(name);
    return { name: cleanName, brand, color };
  }
  return parseNaturalProduct(entry);
}

function parseProductsInput(options: ProductsOptions): ParsedProduct[] {
  const products: ParsedProduct[] = [];

  if (options.products) {
    const parsed = parseProductEntry(options.products);
    if (parsed.name) {
      products.push(parsed);
      log("debug", `Parsed: "${options.products}" → name="${parsed.name}", brand="${parsed.brand}"`);
    }
  }

  if (options.productsFile) {
    try {
      const content = readFileSync(options.productsFile, "utf-8");
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));

      for (const line of lines) {
        const parsed = parseProductEntry(line);
        if (parsed.name) {
          products.push(parsed);
          log("debug", `Parsed: "${line}" → name="${parsed.name}", brand="${parsed.brand}"`);
        }
      }
      log("info", `Loaded ${products.length} product(s) from ${options.productsFile}`);
    } catch (err) {
      log("error", `Failed to read products file: ${options.productsFile}`, err);
    }
  }

  return products;
}

export async function runProductsPipeline(
  options: ProductsOptions
): Promise<ProductsResult> {
  const delay = options.delay ?? 1000;

  const result: ProductsResult = {
    inserted: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const products = parseProductsInput(options);

    if (products.length === 0) {
      log("error", "No products to process. Provide --products or --products-file.");
      return result;
    }

    log("info", `Processing ${products.length} product(s) (delay: ${delay}ms)`);

    for (let i = 0; i < products.length; i++) {
      const { name, brand, color } = products[i];
      const displayName = brand ? `"${name}" by ${brand}` : `"${name}"`;
      const colorInfo = color ? ` (${color})` : "";
      log("info", `[${i + 1}/${products.length}] Processing: ${displayName}${colorInfo}`);

      try {
        const { exists, hasImage } = await checkProductExists(name, brand);

        if (exists && hasImage) {
          log("debug", `Skipping existing product with image: ${displayName}`);
          result.skipped++;
          continue;
        }

        let imageUrl: string | null = null;

        if (!options.skipImages) {
          const searchQuery = color ? `${name} ${color}` : name;
          const imageUrls = await searchProductImagesWithDelay(searchQuery, brand, delay, 5);

          if (imageUrls.length === 0) {
            log("warn", `No image found for ${displayName}`);
          } else {
            for (let attempt = 0; attempt < Math.min(5, imageUrls.length); attempt++) {
              const sourceUrl = imageUrls[attempt];
              try {
                log("debug", `Trying image source ${attempt + 1}/${Math.min(5, imageUrls.length)}: ${sourceUrl}`);
                const uploaded = await downloadAndUploadImage(sourceUrl, brand, name);
                imageUrl = uploaded.imageUrl;
                break;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                log("warn", `Image download failed (attempt ${attempt + 1}): ${msg}`);
                if (attempt === Math.min(5, imageUrls.length) - 1) {
                  log("warn", `All image sources failed for ${displayName}`);
                }
              }
            }
          }
        }

        if (exists && !hasImage && imageUrl) {
          if (options.dryRun) {
            log("success", `[DRY RUN] Would update image for: ${displayName}`);
          } else {
            await updateProductImage(name, brand, imageUrl);
          }
          result.inserted++;
          continue;
        }

        if (exists) {
          log("debug", `Skipping existing product (no new image): ${displayName}`);
          result.skipped++;
          continue;
        }

        const productData = {
          name,
          brandName: brand,
          color,
          imageUrl,
        };

        if (options.dryRun) {
          log("success", `[DRY RUN] Would insert: ${displayName}${colorInfo}`);
          result.inserted++;
        } else {
          await upsertProduct(productData);
          result.inserted++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        log("error", `Failed to process ${displayName}: ${errorMsg}`);
        result.errors.push({ product: `${name}, ${brand ?? ""}`, error: errorMsg });
      }
    }

    log("success", "─── Products Pipeline Complete ───");
    log("info", `  Products processed: ${products.length}`);
    log("info", `  Inserted:           ${result.inserted}`);
    log("info", `  Skipped:            ${result.skipped}`);
    log("info", `  Errors:             ${result.errors.length}`);

    return result;
  } finally {
    await closeDdgsService();
    await closeDb();
  }
}
