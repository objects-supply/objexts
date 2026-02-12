import { parseArgs } from "node:util";
import { runPipeline } from "./pipeline.js";
import type { ScrapeOptions } from "./adapters/types.js";
import { log } from "./utils.js";

// ─── CLI Argument Parsing ─────────────────────────────────────

function printUsage() {
  console.log(`
seed-pipeline - Scrape product data into the offered_objects table

USAGE:
  npm run scrape -- [OPTIONS]

OPTIONS:
  --url <url>          URL to scrape (product page or listing page)
  --file <path>        Path to a file containing URLs (one per line)
  --crawl              Treat URL as a listing page and discover product links
  --dry-run            Preview results without inserting into the database
  --delay <ms>         Delay between requests in milliseconds (default: 1500)
  --concurrency <n>    Maximum concurrent pages (default: 3)
  --limit <n>          Maximum number of products to scrape
  --help               Show this help message

EXAMPLES:
  # Scrape a single product page
  npm run scrape -- --url "https://apple.com/airpods-pro"

  # Crawl a category page for product links, then scrape each
  npm run scrape -- --url "https://example.com/products" --crawl

  # Scrape URLs from a file with a dry run
  npm run scrape -- --file urls.txt --dry-run

  # Custom rate limiting
  npm run scrape -- --url "https://example.com/product" --delay 3000 --concurrency 1
`);
}

function parseCliArgs(): ScrapeOptions | null {
  try {
    const { values } = parseArgs({
      options: {
        url: { type: "string" },
        file: { type: "string" },
        crawl: { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
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

    if (!values.url && !values.file) {
      log("error", "Either --url or --file is required.");
      printUsage();
      return null;
    }

    return {
      url: values.url,
      file: values.file,
      crawl: values.crawl,
      dryRun: values["dry-run"],
      delay: values.delay ? parseInt(values.delay, 10) : undefined,
      concurrency: values.concurrency
        ? parseInt(values.concurrency, 10)
        : undefined,
      limit: values.limit ? parseInt(values.limit, 10) : undefined,
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

  const options = parseCliArgs();
  if (!options) {
    process.exit(1);
  }

  log("info", "Starting pipeline...");
  if (options.dryRun) {
    log("warn", "DRY RUN mode — no database writes will be made.");
  }

  try {
    const result = await runPipeline(options);

    if (result.errors.length > 0) {
      log("warn", `\n${result.errors.length} error(s):`);
      for (const e of result.errors) {
        log("error", `  ${e.url}: ${e.error}`);
      }
    }

    process.exit(result.errors.length > 0 ? 1 : 0);
  } catch (err) {
    log("error", "Pipeline failed:", err);
    process.exit(1);
  }
}

main();
