"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { objects, brands, offeredObjects } from "@/lib/db/schema";
import { eq, and, desc, asc, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils/slugify";

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function findOrCreateBrand(
  userId: string,
  brandName: string,
  brandUrl?: string
) {
  const slug = slugify(brandName);

  // Try to find existing brand
  const existing = await db.query.brands.findFirst({
    where: and(eq(brands.userId, userId), eq(brands.slug, slug)),
  });

  if (existing) return existing;

  // Create new brand
  const [newBrand] = await db
    .insert(brands)
    .values({
      userId,
      name: brandName,
      slug,
      url: brandUrl || null,
    })
    .returning();

  return newBrand;
}

export async function createObject(formData: FormData) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const brandName = formData.get("brandName") as string;
  const productUrl = formData.get("productUrl") as string;
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
  let brandSlug: string | null = null;

  if (brandName) {
    const brand = await findOrCreateBrand(user.id, brandName);
    brandId = brand.id;
    brandSlug = brand.slug;
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
    const [newObject] = await db
      .insert(objects)
      .values({
        userId: user.id,
        name,
        brandId,
        brandName: brandName || null,
        brandSlug,
        productUrl: productUrl || null,
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
    return { success: true, object: newObject };
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
  const productUrl = formData.get("productUrl") as string;
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
  let brandSlug: string | null = null;

  if (brandName) {
    const brand = await findOrCreateBrand(user.id, brandName);
    brandId = brand.id;
    brandSlug = brand.slug;
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
      .update(objects)
      .set({
        name,
        brandId,
        brandName: brandName || null,
        brandSlug,
        productUrl: productUrl || null,
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
      .where(and(eq(objects.id, objectId), eq(objects.userId, user.id)));

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
      .delete(objects)
      .where(and(eq(objects.id, objectId), eq(objects.userId, user.id)));

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

  return db.query.objects.findMany({
    where: eq(objects.userId, user.id),
    orderBy: [desc(objects.acquiredAt)],
    with: {
      images: true,
    },
  });
}

export async function getObjectById(objectId: string) {
  const user = await getAuthUser();
  if (!user) return null;

  return db.query.objects.findFirst({
    where: and(eq(objects.id, objectId), eq(objects.userId, user.id)),
    with: {
      images: true,
    },
  });
}

export async function getUserBrands() {
  const user = await getAuthUser();
  if (!user) return [];

  return db.query.brands.findMany({
    where: eq(brands.userId, user.id),
    orderBy: [brands.name],
  });
}

export async function searchOfferedObjects(query: string, limit = 8) {
  const normalizedQuery = query.trim();
  const safeLimit = Math.min(Math.max(limit, 1), 20);

  if (!normalizedQuery) {
    return db.query.offeredObjects.findMany({
      where: eq(offeredObjects.isActive, true),
      orderBy: [asc(offeredObjects.name)],
      limit: safeLimit,
    });
  }

  return db.query.offeredObjects.findMany({
    where: and(
      eq(offeredObjects.isActive, true),
      or(
        ilike(offeredObjects.name, `%${normalizedQuery}%`),
        ilike(offeredObjects.brandName, `%${normalizedQuery}%`),
        ilike(offeredObjects.category, `%${normalizedQuery}%`)
      )
    ),
    orderBy: [asc(offeredObjects.name)],
    limit: safeLimit,
  });
}
