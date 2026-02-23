"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { inventory, brands, products } from "@/lib/db/schema";
import { eq, and, desc, asc, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils/slugify";
import { requireAdmin } from "@/lib/auth";

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function findOrCreateBrand(
  brandName: string,
  brandUrl?: string
) {
  const slug = slugify(brandName);

  // Try to find existing brand (global, not user-scoped)
  const existing = await db.query.brands.findFirst({
    where: eq(brands.slug, slug),
  });

  if (existing) return existing;

  // Create new brand using Supabase client for RLS
  const supabase = await createClient();
  const { data: newBrand, error } = await supabase
    .from("brands")
    .insert({
      name: brandName,
      slug,
      url: brandUrl || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return newBrand;
}

export async function createObject(formData: FormData) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const productId = formData.get("productId") as string | null;
  const brandName = formData.get("brandName") as string;
  const sourceUrl = formData.get("productUrl") as string;
  const description = formData.get("description") as string;
  const acquisitionType =
    (formData.get("acquisitionType") as string) || "Purchased";
  const reason = formData.get("reason") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const price = formData.get("price") as string;
  const currency = (formData.get("currency") as string) || "USD";
  const category = formData.get("category") as string;
  const acquiredAt = formData.get("acquiredAt") as string;
  const customFieldsRaw = formData.get("customFields") as string;

  if (!name) return { error: "Name is required" };

  let brandId: string | null = null;

  if (brandName) {
    const brand = await findOrCreateBrand(brandName);
    brandId = brand.id;
  }

  let customFields: Record<string, string> | null = null;
  if (customFieldsRaw) {
    try {
      customFields = JSON.parse(customFieldsRaw);
    } catch {
      // ignore invalid JSON
    }
  }

  try {
    const [newItem] = await db
      .insert(inventory)
      .values({
        userId: user.id,
        productId: productId || null,
        name,
        brandId,
        sourceUrl: sourceUrl || null,
        description: description || null,
        acquisitionType,
        reason: reason || null,
        quantity,
        price: price || null,
        currency,
        category: category || null,
        customFields,
        acquiredAt: acquiredAt ? new Date(acquiredAt) : new Date(),
      })
      .returning();

    revalidatePath("/dashboard");
    return { success: true, object: newItem };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create object";
    return { error: message };
  }
}

export async function updateObject(objectId: string, formData: FormData) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const brandName = formData.get("brandName") as string;
  const sourceUrl = formData.get("productUrl") as string;
  const description = formData.get("description") as string;
  const acquisitionType =
    (formData.get("acquisitionType") as string) || "Purchased";
  const reason = formData.get("reason") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const price = formData.get("price") as string;
  const currency = (formData.get("currency") as string) || "USD";
  const category = formData.get("category") as string;
  const acquiredAt = formData.get("acquiredAt") as string;
  const isPublic = formData.get("isPublic") !== "false";
  const customFieldsRaw = formData.get("customFields") as string;

  if (!name) return { error: "Name is required" };

  let brandId: string | null = null;

  if (brandName) {
    const brand = await findOrCreateBrand(brandName);
    brandId = brand.id;
  }

  let customFields: Record<string, string> | null = null;
  if (customFieldsRaw) {
    try {
      customFields = JSON.parse(customFieldsRaw);
    } catch {
      // ignore
    }
  }

  try {
    await db
      .update(inventory)
      .set({
        name,
        brandId,
        
        sourceUrl: sourceUrl || null,
        description: description || null,
        acquisitionType,
        reason: reason || null,
        quantity,
        price: price || null,
        currency,
        category: category || null,
        customFields,
        isPublic,
        acquiredAt: acquiredAt ? new Date(acquiredAt) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(inventory.id, objectId), eq(inventory.userId, user.id)));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update object";
    return { error: message };
  }
}

export async function deleteObject(objectId: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  try {
    await db
      .delete(inventory)
      .where(and(eq(inventory.id, objectId), eq(inventory.userId, user.id)));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete object";
    return { error: message };
  }
}

export async function getUserObjects() {
  const user = await getAuthUser();
  if (!user) return [];

  return db.query.inventory.findMany({
    where: eq(inventory.userId, user.id),
    orderBy: [desc(inventory.acquiredAt)],
    with: {
      brand: true,
      product: true,
    },
  });
}

export async function getObjectById(objectId: string) {
  const user = await getAuthUser();
  if (!user) return null;

  return db.query.inventory.findFirst({
    where: and(eq(inventory.id, objectId), eq(inventory.userId, user.id)),
    with: {
      brand: true,
      product: true,
    },
  });
}

export async function getUserBrands() {
  const user = await getAuthUser();
  if (!user) return [];

  // Get brands that the user has items for
  const userItems = await db.query.inventory.findMany({
    where: eq(inventory.userId, user.id),
    columns: { brandId: true },
  });

  const brandIds = [...new Set(userItems.map(i => i.brandId).filter(Boolean))];
  if (brandIds.length === 0) return [];

  return db.query.brands.findMany({
    where: or(...brandIds.map(id => eq(brands.id, id!))),
    orderBy: [brands.name],
  });
}

export async function searchProducts(query: string, limit = 8) {
  const normalizedQuery = query.trim();
  const safeLimit = Math.min(Math.max(limit, 1), 20);

  if (!normalizedQuery) {
    return db.query.products.findMany({
      where: eq(products.isActive, true),
      orderBy: [asc(products.name)],
      limit: safeLimit,
      with: {
        brand: true,
      },
    });
  }

  return db.query.products.findMany({
    where: and(
      eq(products.isActive, true),
      or(
        ilike(products.name, `%${normalizedQuery}%`),
        ilike(products.category, `%${normalizedQuery}%`)
      )
    ),
    orderBy: [asc(products.name)],
    limit: safeLimit,
    with: {
      brand: true,
    },
  });
}

export async function createProduct(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  console.log("Creating product - profile:", profile.id, "role:", profile.role);
  console.log("Supabase client user:", user?.id);

  const name = formData.get("name") as string;
  const brandName = formData.get("brandName") as string;
  const productUrl = formData.get("productUrl") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const defaultPrice = formData.get("defaultPrice") as string;
  const customFieldsRaw = formData.get("customFields") as string;

  if (!name) return { error: "Name is required" };

  let brandId: string | null = null;

  if (brandName) {
    const brand = await findOrCreateBrand(brandName);
    brandId = brand.id;
  }

  let customFields: Record<string, string> | null = null;
  if (customFieldsRaw) {
    try {
      customFields = JSON.parse(customFieldsRaw);
    } catch {
      // ignore invalid JSON
    }
  }

  try {
    console.log("Inserting product with brand_id:", brandId);
    const { data: newProduct, error } = await supabase
      .from("products")
      .insert({
        name,
        brand_id: brandId,
        product_url: productUrl || null,
        image_url: imageUrl || null,
        category: category || null,
        description: description || null,
        default_price: defaultPrice || null,
        custom_fields: customFields,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Product insert error:", error);
      return { error: `${error.message} (code: ${error.code})` };
    }

    revalidatePath("/dashboard");
    return { success: true, product: newProduct };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create product";
    return { error: message };
  }
}
