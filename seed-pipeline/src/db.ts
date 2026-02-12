import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { and, eq, sql } from "drizzle-orm";
import type { OfferedObjectInsert } from "./transformer.js";
import { log } from "./utils.js";

// ─── Schema (mirrors the main app's offered_objects table) ────
const offeredObjects = pgTable("offered_objects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brandName: text("brand_name"),
  productUrl: text("product_url"),
  category: text("category"),
  description: text("description"),
  defaultPrice: numeric("default_price", { precision: 10, scale: 2 }),
  customFields: jsonb("custom_fields").$type<Record<string, string>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Database Connection ──────────────────────────────────────

let db: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is required. " +
        "Copy .env.example to .env and set your connection string."
      );
    }
    client = postgres(connectionString, { prepare: false });
    db = drizzle(client);
  }
  return db;
}

/**
 * Close the database connection.
 */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    db = null;
    log("debug", "Database connection closed");
  }
}

// ─── Database Operations ──────────────────────────────────────

/**
 * Check if a product already exists by name + brand_name.
 */
async function productExists(
  name: string,
  brandName: string | null
): Promise<boolean> {
  const database = getDb();

  const conditions = brandName
    ? and(
        eq(offeredObjects.name, name),
        eq(offeredObjects.brandName, brandName)
      )
    : and(
        eq(offeredObjects.name, name),
        sql`${offeredObjects.brandName} IS NULL`
      );

  const existing = await database
    .select({ id: offeredObjects.id })
    .from(offeredObjects)
    .where(conditions!)
    .limit(1);

  return existing.length > 0;
}

/**
 * Insert products into offered_objects, skipping duplicates.
 * Returns counts of inserted and skipped records.
 */
export async function upsertProducts(
  products: OfferedObjectInsert[]
): Promise<{ inserted: number; skipped: number }> {
  const database = getDb();
  let inserted = 0;
  let skipped = 0;

  for (const product of products) {
    const exists = await productExists(
      product.name,
      product.brandName ?? null
    );

    if (exists) {
      log("debug", `Skipping duplicate: "${product.name}" by ${product.brandName ?? "unknown"}`);
      skipped++;
      continue;
    }

    await database.insert(offeredObjects).values({
      name: product.name,
      brandName: product.brandName,
      productUrl: product.productUrl,
      category: product.category,
      description: product.description,
      defaultPrice: product.defaultPrice ?? undefined,
      customFields: product.customFields,
      isActive: product.isActive ?? true,
    });

    log("success", `Inserted: "${product.name}" by ${product.brandName ?? "unknown"}`);
    inserted++;
  }

  log(
    "info",
    `Database: ${inserted} inserted, ${skipped} skipped (duplicates)`
  );

  return { inserted, skipped };
}

/**
 * Dry run: check which products would be inserted vs skipped.
 */
export async function dryRunProducts(
  products: OfferedObjectInsert[]
): Promise<{ wouldInsert: number; wouldSkip: number }> {
  let wouldInsert = 0;
  let wouldSkip = 0;

  for (const product of products) {
    const exists = await productExists(
      product.name,
      product.brandName ?? null
    );

    if (exists) {
      log("debug", `[DRY RUN] Would skip: "${product.name}" by ${product.brandName ?? "unknown"}`);
      wouldSkip++;
    } else {
      log("success", `[DRY RUN] Would insert: "${product.name}" by ${product.brandName ?? "unknown"}`);
      wouldInsert++;
    }
  }

  log(
    "info",
    `[DRY RUN] Would insert ${wouldInsert}, would skip ${wouldSkip}`
  );

  return { wouldInsert, wouldSkip };
}
