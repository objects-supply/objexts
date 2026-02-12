import { z } from "zod";
import type { RawProduct } from "./adapters/types.js";
import { log } from "./utils.js";

/**
 * Zod schema for validating scraped product data before insertion.
 * Ensures required fields exist and coerces types where needed.
 */
const rawProductSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(500, "Product name too long")
    .transform((s) => s.trim()),

  brand: z
    .string()
    .max(200)
    .transform((s) => s.trim())
    .optional(),

  url: z
    .string()
    .url("Invalid product URL")
    .optional(),

  description: z
    .string()
    .max(500)
    .transform((s) => s.trim())
    .optional(),

  price: z
    .string()
    .transform((s) => {
      // Remove currency symbols and whitespace, keep digits and decimal
      const cleaned = s.replace(/[^0-9.]/g, "");
      const num = parseFloat(cleaned);
      if (isNaN(num) || num < 0) return undefined;
      return num.toFixed(2);
    })
    .optional(),

  currency: z
    .string()
    .max(10)
    .optional(),

  category: z
    .string()
    .max(200)
    .transform((s) => s.trim())
    .optional(),

  imageUrl: z
    .string()
    .url()
    .optional(),

  attributes: z
    .record(z.string())
    .optional(),
});

export type ValidatedProduct = z.infer<typeof rawProductSchema>;

/**
 * Validate a single scraped product.
 * Returns the validated product, or null if validation fails.
 */
export function validateProduct(product: RawProduct): ValidatedProduct | null {
  const result = rawProductSchema.safeParse(product);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    log("warn", `Validation failed for "${product.name}": ${issues.join(", ")}`);
    return null;
  }

  return result.data;
}

/**
 * Validate an array of scraped products.
 * Returns only the valid ones, logging warnings for rejected entries.
 */
export function validateProducts(products: RawProduct[]): ValidatedProduct[] {
  const validated: ValidatedProduct[] = [];

  for (const product of products) {
    const result = validateProduct(product);
    if (result) validated.push(result);
  }

  log(
    "info",
    `Validated ${validated.length}/${products.length} products (${products.length - validated.length} rejected)`
  );

  return validated;
}
