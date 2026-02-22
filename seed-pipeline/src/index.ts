import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(import.meta.dirname, "../../.env.development.local") });
import { parseArgs } from "node:util";
import { runPipeline, runProductsPipeline } from "./pipeline.js";
import type { ScrapeOptions, ProductsOptions } from "./adapters/types.js";
import { log } from "./utils.js";

// ─── CLI Argument Parsing ─────────────────────────────────────

function printUsage() {
  console.log(`
seed-pipeline - Scrape product data into the products table

USAGE:
  npm run scrape -- [OPTIONS]

URL SCRAPING MODE:
  --url <url>          URL to scrape (product page or listing page)
  --file <path>        Path to a file containing URLs (one per line)
  --crawl              Treat URL as a listing page and discover product links
  --concurrency <n>    Maximum concurrent pages (default: 3)
  --limit <n>          Maximum number of products to scrape

PRODUCT SEARCH MODE:
  --products <entry>   Single product entry: "Product Name, Brand"
  --products-file <p>  Path to file with products (one per line: "Name, Brand")

COMMON OPTIONS:
  --dry-run            Preview results without inserting into the database
  --skip-images        Skip downloading and uploading product images
  --update-images      Re-fetch and update images for existing products
  --delay <ms>         Delay between requests in milliseconds (default: 1500)
  --help               Show this help message

EXAMPLES:
  # Scrape a single product page
  npm run scrape -- --url "https://apple.com/airpods-pro"

  # Crawl a category page for product links, then scrape each
  npm run scrape -- --url "https://example.com/products" --crawl

  # Scrape URLs from a file with a dry run
  npm run scrape -- --file urls.txt --dry-run

  # Search and add a single product by name + brand
  npm run scrape -- --products "AirPods Pro, Apple"

  # Import products from a file
  npm run scrape -- --products-file data/products.txt

  # Dry run product import
  npm run scrape -- --products-file data/products.txt --dry-run
`);
}

interface ParsedArgs {
  mode: "scrape" | "products";
  scrapeOptions?: ScrapeOptions;
  productsOptions?: ProductsOptions;
}

function parseCliArgs(): ParsedArgs | null {
  try {
    const { values } = parseArgs({
      options: {
        url: { type: "string" },
        file: { type: "string" },
        products: { type: "string" },
        "products-file": { type: "string" },
        crawl: { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
        "skip-images": { type: "boolean", default: false },
        delay: { type: "string" },
        concurrency: { type: "string" },
        limit: { type: "string" },
        help: { type: "boolean", default: false },
      },
      strict: true,
    });

    if (values.help) {
      printUsage();
      return null;
    }

    const hasUrlMode = values.url || values.file;
    const hasProductsMode = values.products || values["products-file"];

    if (!hasUrlMode && !hasProductsMode) {
      log("error", "Specify --url/--file for scraping or --products/--products-file for search mode.");
      printUsage();
      return null;
    }

    if (hasUrlMode && hasProductsMode) {
      log("error", "Cannot mix URL scraping and product search modes.");
      printUsage();
      return null;
    }

    if (hasProductsMode) {
      return {
        mode: "products",
        productsOptions: {
          products: values.products,
          productsFile: values["products-file"],
          dryRun: values["dry-run"],
          skipImages: values["skip-images"],
          delay: values.delay ? parseInt(values.delay, 10) : undefined,
        },
      };
    }

    return {
      mode: "scrape",
      scrapeOptions: {
        url: values.url,
        file: values.file,
        crawl: values.crawl,
        dryRun: values["dry-run"],
        skipImages: values["skip-images"],
        delay: values.delay ? parseInt(values.delay, 10) : undefined,
        concurrency: values.concurrency
          ? parseInt(values.concurrency, 10)
          : undefined,
        limit: values.limit ? parseInt(values.limit, 10) : undefined,
      },
    };
  } catch (err) {
    log("error", `Invalid arguments: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  log("info", "seed-pipeline v0.1.0");

  const parsed = parseCliArgs();
  if (!parsed) {
    process.exit(1);
  }

  const dryRun = parsed.mode === "products"
    ? parsed.productsOptions?.dryRun
    : parsed.scrapeOptions?.dryRun;

  log("info", `Starting ${parsed.mode} pipeline...`);
  if (dryRun) {
    log("warn", "DRY RUN mode — no database writes will be made.");
  }

  try {
    if (parsed.mode === "products") {
      const result = await runProductsPipeline(parsed.productsOptions!);

      if (result.errors.length > 0) {
        log("warn", `\n${result.errors.length} error(s):`);
        for (const e of result.errors) {
          log("error", `  ${e.product}: ${e.error}`);
        }
      }

      process.exit(result.errors.length > 0 ? 1 : 0);
    } else {
      const result = await runPipeline(parsed.scrapeOptions!);

      if (result.errors.length > 0) {
        log("warn", `\n${result.errors.length} error(s):`);
        for (const e of result.errors) {
          log("error", `  ${e.url}: ${e.error}`);
        }
      }

      process.exit(result.errors.length > 0 ? 1 : 0);
    }
  } catch (err) {
    log("error", "Pipeline failed:", err);
    process.exit(1);
  }
}

main();
