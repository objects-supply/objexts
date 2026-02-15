"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { inventory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function uploadInventoryImage(inventoryId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the inventory item belongs to this user
  const item = await db.query.inventory.findFirst({
    where: and(eq(inventory.id, inventoryId), eq(inventory.userId, user.id)),
  });

  if (!item) return { error: "Item not found" };

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${inventoryId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(fileName, file);

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(fileName);

  // Update the inventory item's imageUrl
  await db
    .update(inventory)
    .set({
      imageUrl: publicUrl,
      updatedAt: new Date(),
    })
    .where(eq(inventory.id, inventoryId));

  revalidatePath("/dashboard");
  return { success: true, url: publicUrl };
}

export async function deleteInventoryImage(inventoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const item = await db.query.inventory.findFirst({
    where: and(eq(inventory.id, inventoryId), eq(inventory.userId, user.id)),
  });

  if (!item) return { error: "Item not found" };
  if (!item.imageUrl) return { error: "No image to delete" };

  // Extract storage path from URL
  const urlParts = item.imageUrl.split("/product-images/");
  if (urlParts.length === 2) {
    await supabase.storage.from("product-images").remove([urlParts[1]]);
  }

  await db
    .update(inventory)
    .set({
      imageUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(inventory.id, inventoryId));

  revalidatePath("/dashboard");
  return { success: true };
}
