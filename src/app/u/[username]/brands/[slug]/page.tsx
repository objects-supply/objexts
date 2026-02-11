import { db } from "@/lib/db";
import { profiles, objects, brands } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InventoryTimeline } from "@/components/inventory-timeline";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ username: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username),
  });

  if (!profile) return { title: "Not Found" };

  const brand = await db.query.brands.findFirst({
    where: and(eq(brands.userId, profile.id), eq(brands.slug, slug)),
  });

  if (!brand) return { title: "Not Found" };

  return {
    title: `${brand.name} — ${profile.displayName || username}'s Inventory`,
    description: `All ${brand.name} objects in ${username}'s inventory.`,
  };
}

export default async function BrandPage({ params }: Props) {
  const { username, slug } = await params;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username),
  });

  if (!profile) notFound();

  const brand = await db.query.brands.findFirst({
    where: and(eq(brands.userId, profile.id), eq(brands.slug, slug)),
  });

  if (!brand) notFound();

  const brandObjects = await db.query.objects.findMany({
    where: and(
      eq(objects.userId, profile.id),
      eq(objects.brandSlug, slug),
      eq(objects.isPublic, true)
    ),
    orderBy: [desc(objects.acquiredAt)],
  });

  return (
    <div>
      <div className="mb-10">
        <Link
          href={`/u/${username}`}
          className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          &larr; Back to inventory
        </Link>
        <h1 className="text-lg font-medium tracking-tight mt-3">
          {brand.name}
        </h1>
        {brand.url && (
          <a
            href={brand.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            {brand.url}
          </a>
        )}
      </div>

      <InventoryTimeline objects={brandObjects} username={username} />
    </div>
  );
}
