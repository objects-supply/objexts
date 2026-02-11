import { db } from "@/lib/db";
import { profiles, objects } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { InventoryTimeline } from "@/components/inventory-timeline";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username),
  });

  if (!profile) {
    notFound();
  }

  const userObjects = await db.query.objects.findMany({
    where: and(eq(objects.userId, profile.id), eq(objects.isPublic, true)),
    orderBy: [desc(objects.acquiredAt)],
  });

  return (
    <div>
      <h1 className="text-lg font-medium tracking-tight mb-10">Inventory</h1>
      <InventoryTimeline objects={userObjects} username={username} />
    </div>
  );
}
