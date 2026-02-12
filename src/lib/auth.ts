import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/lib/db/schema";

/**
 * Get the current authenticated user's profile including their role.
 * Returns null if not authenticated.
 */
export async function getAuthProfile() {
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

/**
 * Check if the current user has the given role.
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const profile = await getAuthProfile();
  return profile?.role === role;
}

/**
 * Require the current user to be an admin.
 * Throws if not authenticated or not an admin.
 * For use in server actions.
 */
export async function requireAdmin() {
  const profile = await getAuthProfile();

  if (!profile) {
    throw new Error("Not authenticated");
  }

  if (profile.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }

  return profile;
}
