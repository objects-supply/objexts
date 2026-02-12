"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { objectImages, objects } from "@/lib/db/schema";
import { eq, and, asc, ne } from "drizzle-orm";
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

  const [insertedImage] = await db
    .insert(objectImages)
    .values({
      objectId,
      storagePath: fileName,
      url: publicUrl,
      sortOrder: maxSort + 1,
    })
    .returning({ id: objectImages.id, url: objectImages.url });

  // First uploaded image becomes the cover by default.
  if (!object.coverImageId && insertedImage) {
    await db
      .update(objects)
      .set({
        coverImageId: insertedImage.id,
        imageUrl: insertedImage.url,
        updatedAt: new Date(),
      })
      .where(eq(objects.id, objectId));
  }

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

  const wasCoverImage = image.object.coverImageId === image.id;

  // Delete from database
  await db.delete(objectImages).where(eq(objectImages.id, imageId));

  if (wasCoverImage) {
    const [nextImage] = await db
      .select({ id: objectImages.id, url: objectImages.url })
      .from(objectImages)
      .where(
        and(
          eq(objectImages.objectId, image.objectId),
          ne(objectImages.id, imageId)
        )
      )
      .orderBy(asc(objectImages.sortOrder))
      .limit(1);

    await db
      .update(objects)
      .set({
        coverImageId: nextImage?.id ?? null,
        imageUrl: nextImage?.url ?? null,
        updatedAt: new Date(),
      })
      .where(eq(objects.id, image.objectId));
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function setObjectCoverImage(objectId: string, imageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const object = await db.query.objects.findFirst({
    where: and(eq(objects.id, objectId), eq(objects.userId, user.id)),
  });
  if (!object) return { error: "Object not found" };

  const image = await db.query.objectImages.findFirst({
    where: and(eq(objectImages.id, imageId), eq(objectImages.objectId, objectId)),
  });
  if (!image) return { error: "Image not found for this object" };

  await db
    .update(objects)
    .set({
      coverImageId: image.id,
      imageUrl: image.url,
      updatedAt: new Date(),
    })
    .where(eq(objects.id, objectId));

  revalidatePath("/dashboard");
  return { success: true };
}
