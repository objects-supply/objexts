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
import type { ProductInsert } from "./transformer.js";
import { log } from "./utils.js";

// ─── Schema ────
const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  url: text("url"),
  imageUrl: text("image_url"),
});

const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brandId: uuid("brand_id"),
  productUrl: text("product_url"),
  imageUrl: text("image_url"),
  color: text("color"),
  category: text("category"),
  description: text("description"),
  defaultPrice: numeric("default_price", { precision: 10, scale: 2 }),
  customFields: jsonb("custom_fields").$type<Record<string, string>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow(),
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

/**
 * Get or create a brand by name. Returns the brand ID.
 */
async function getOrCreateBrand(brandName: string): Promise<string> {
  const database = getDb();
  const slug = slugify(brandName);

  const existing = await database
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const inserted = await database
    .insert(brands)
    .values({ name: brandName, slug })
    .returning({ id: brands.id });

  log("debug", `Created brand: "${brandName}" (${slug})`);
  return inserted[0].id;
}

/**
 * Check if a product already exists by name + brand_id.
 */
async function productExists(
  name: string,
  brandId: string | null
): Promise<boolean> {
  const database = getDb();

  const conditions = brandId
    ? and(
        eq(products.name, name),
        eq(products.brandId, brandId)
      )
    : and(
        eq(products.name, name),
        sql`${products.brandId} IS NULL`
      );

  const existing = await database
    .select({ id: products.id })
    .from(products)
    .where(conditions!)
    .limit(1);

  return existing.length > 0;
}

/**
 * Check if a product exists by name + brand name.
 * Returns { exists: boolean, hasImage: boolean }
 */
export async function checkProductExists(
  name: string,
  brandName: string | null
): Promise<{ exists: boolean; hasImage: boolean }> {
  const database = getDb();
  const brandId = brandName ? await getOrCreateBrand(brandName) : null;

  const conditions = brandId
    ? and(eq(products.name, name), eq(products.brandId, brandId))
    : and(eq(products.name, name), sql`${products.brandId} IS NULL`);

  const existing = await database
    .select({ id: products.id, imageUrl: products.imageUrl })
    .from(products)
    .where(conditions!)
    .limit(1);

  if (existing.length === 0) {
    return { exists: false, hasImage: false };
  }
  return { exists: true, hasImage: !!existing[0].imageUrl };
}

/**
 * Update image URL for an existing product.
 */
export async function updateProductImage(
  name: string,
  brandName: string | null,
  imageUrl: string
): Promise<void> {
  const database = getDb();
  const brandId = brandName ? await getOrCreateBrand(brandName) : null;

  const conditions = brandId
    ? and(eq(products.name, name), eq(products.brandId, brandId))
    : and(eq(products.name, name), sql`${products.brandId} IS NULL`);

  await database
    .update(products)
    .set({ imageUrl })
    .where(conditions!);

  log("success", `Updated image for "${name}"`);
}

/**
 * Insert products into products table, skipping duplicates.
 * Returns counts of inserted and skipped records.
 */
export async function upsertProducts(
  items: ProductInsert[]
): Promise<{ inserted: number; skipped: number }> {
  const database = getDb();
  let inserted = 0;
  let skipped = 0;

  for (const product of items) {
    const brandId = product.brandName
      ? await getOrCreateBrand(product.brandName)
      : null;

    const exists = await productExists(product.name, brandId);

    if (exists) {
      log("debug", `Skipping duplicate: "${product.name}" by ${product.brandName ?? "unknown"}`);
      skipped++;
      continue;
    }

    await database.insert(products).values({
      name: product.name,
      brandId: brandId,
      productUrl: product.productUrl,
      imageUrl: product.imageUrl,
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
  items: ProductInsert[]
): Promise<{ wouldInsert: number; wouldSkip: number }> {
  let wouldInsert = 0;
  let wouldSkip = 0;

  for (const product of items) {
    const brandId = product.brandName
      ? await getOrCreateBrand(product.brandName)
      : null;

    const exists = await productExists(product.name, brandId);

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

interface SimpleProductInput {
  name: string;
  brandName: string | null;
  color: string | null;
  imageUrl: string | null;
}

/**
 * Insert a single product into products table.
 * Creates brand if needed and links via brand_id.
 * Returns true if inserted, false if skipped (duplicate).
 */
export async function upsertProduct(product: SimpleProductInput): Promise<boolean> {
  const database = getDb();

  const brandId = product.brandName
    ? await getOrCreateBrand(product.brandName)
    : null;

  const exists = await productExists(product.name, brandId);

  if (exists) {
    log("debug", `Skipping duplicate: "${product.name}" by ${product.brandName ?? "unknown"}`);
    return false;
  }

  await database.insert(products).values({
    name: product.name,
    brandId: brandId,
    color: product.color,
    imageUrl: product.imageUrl,
    isActive: true,
  });

  const colorInfo = product.color ? ` (${product.color})` : "";
  const imgInfo = product.imageUrl ? " with image" : " (no image)";
  log("success", `Inserted: "${product.name}" by ${product.brandName ?? "unknown"}${colorInfo}${imgInfo}`);
  return true;
}

/**
 * Dry run for a single product.
 * Returns true if would insert, false if would skip.
 */
export async function dryRunProduct(product: SimpleProductInput): Promise<boolean> {
  const brandId = product.brandName
    ? await getOrCreateBrand(product.brandName)
    : null;

  const exists = await productExists(product.name, brandId);

  if (exists) {
    log("debug", `[DRY RUN] Would skip: "${product.name}" by ${product.brandName ?? "unknown"}`);
    return false;
  }

  const colorInfo = product.color ? ` (${product.color})` : "";
  const imgInfo = product.imageUrl ? ` with image: ${product.imageUrl}` : " (no image)";
  log("success", `[DRY RUN] Would insert: "${product.name}" by ${product.brandName ?? "unknown"}${colorInfo}${imgInfo}`);
  return true;
}
