import { db } from "@/lib/db";
import { users, inventory } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { InventoryTimeline } from "@/components/inventory-timeline";

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
    with: {
      brand: true,
      product: true,
    },
  });

  return (
    <div>
      <h1 className="text-lg font-medium tracking-tight mb-10">Inventory</h1>
      <InventoryTimeline objects={userItems} username={username} />
    </div>
  );
}
