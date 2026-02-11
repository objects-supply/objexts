"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const displayName = formData.get("displayName") as string;
  const bio = formData.get("bio") as string;
  const username = formData.get("username") as string;

  if (username && !/^[a-z0-9_-]{3,30}$/.test(username)) {
    return {
      error:
        "Username must be 3-30 characters, lowercase letters, numbers, hyphens, or underscores",
    };
  }

  try {
    await db
      .update(profiles)
      .set({
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(username && { username }),
      })
      .where(eq(profiles.id, user.id));

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    if (message.includes("unique") || message.includes("duplicate")) {
      return { error: "Username is already taken" };
    }
    return { error: message };
  }
}

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  return profile ?? null;
}
