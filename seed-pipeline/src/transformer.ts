import type { ValidatedProduct } from "./validator.js";
import { log } from "./utils.js";

/**
 * Shape matching the offered_objects insert type from the main app's Drizzle schema.
 * Defined here to avoid importing from the main app.
 */
export interface OfferedObjectInsert {
  name: string;
  brandName?: string | null;
  productUrl?: string | null;
  category?: string | null;
  description?: string | null;
  defaultPrice?: string | null;
  customFields?: Record<string, string> | null;
  isActive?: boolean;
}

/**
 * Transform a validated product into an offered_objects insert record.
 */
export function transformProduct(product: ValidatedProduct): OfferedObjectInsert {
  return {
    name: product.name,
    brandName: product.brand ?? null,
    productUrl: product.url ?? null,
    category: product.category ?? null,
    description: product.description ?? null,
    defaultPrice: product.price ?? null,
    customFields:
      product.attributes && Object.keys(product.attributes).length > 0
        ? product.attributes
        : null,
    isActive: true,
  };
}

/**
 * Transform an array of validated products into offered_objects insert records.
 */
export function transformProducts(products: ValidatedProduct[]): OfferedObjectInsert[] {
  const transformed = products.map(transformProduct);
  log("info", `Transformed ${transformed.length} products`);
  return transformed;
}
