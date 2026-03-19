import { db } from "@/lib/db";
import { users, inventory } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PublicProfileClient } from "@/components/public-profile-client";
import { toItem } from "@/types/item";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!profile) {
    notFound();
  }

  const userItems = await db.query.inventory.findMany({
    where: and(eq(inventory.userId, profile.id), eq(inventory.isPublic, true)),
    orderBy: [desc(inventory.acquiredAt)],
    with: { brand: true },
  });

  const items = userItems.map(toItem);

  return (
    <PublicProfileClient
      profile={{
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
      }}
      items={items}
    />
  );
}
