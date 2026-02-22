import type { ValidatedProduct } from "./validator.js";
import { log } from "./utils.js";

/**
 * Shape matching the products insert type from the main app's Drizzle schema.
 */
export interface ProductInsert {
  name: string;
  brandName?: string | null;
  productUrl?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  description?: string | null;
  defaultPrice?: string | null;
  customFields?: Record<string, string> | null;
  isActive?: boolean;
}

/**
 * Transform a validated product into a products insert record.
 */
export function transformProduct(product: ValidatedProduct): ProductInsert {
  return {
    name: product.name,
    brandName: product.brand ?? null,
    productUrl: product.url ?? null,
    imageUrl: product.imageUrl ?? null,
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
 * Transform an array of validated products into products insert records.
 */
export function transformProducts(products: ValidatedProduct[]): ProductInsert[] {
  const transformed = products.map(transformProduct);
  log("info", `Transformed ${transformed.length} products`);
  return transformed;
}
