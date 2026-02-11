"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { objectImages, objects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function uploadObjectImage(objectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the object belongs to this user
  const object = await db.query.objects.findFirst({
    where: and(eq(objects.id, objectId), eq(objects.userId, user.id)),
  });

  if (!object) return { error: "Object not found" };

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${objectId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("object-images")
    .upload(fileName, file);

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("object-images").getPublicUrl(fileName);

  // Get current max sort order
  const existingImages = await db.query.objectImages.findMany({
    where: eq(objectImages.objectId, objectId),
  });

  const maxSort = existingImages.reduce(
    (max, img) => Math.max(max, img.sortOrder),
    -1
  );

  await db.insert(objectImages).values({
    objectId,
    storagePath: fileName,
    url: publicUrl,
    sortOrder: maxSort + 1,
  });

  revalidatePath("/dashboard");
  return { success: true, url: publicUrl };
}

export async function deleteObjectImage(imageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Find the image and verify ownership through the object
  const image = await db.query.objectImages.findFirst({
    where: eq(objectImages.id, imageId),
    with: {
      object: true,
    },
  });

  if (!image || image.object.userId !== user.id) {
    return { error: "Image not found" };
  }

  // Delete from storage
  await supabase.storage.from("object-images").remove([image.storagePath]);

  // Delete from database
  await db.delete(objectImages).where(eq(objectImages.id, imageId));

  revalidatePath("/dashboard");
  return { success: true };
}
