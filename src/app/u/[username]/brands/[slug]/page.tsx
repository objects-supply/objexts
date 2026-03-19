import { db } from "@/lib/db";
import { profiles, inventory, brands } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ItemGridClient } from "@/components/item-grid-client";
import { toItem } from "@/types/item";
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
    where: eq(brands.slug, slug),
  });

  if (!brand) return { title: "Not Found" };

  return {
    title: `${brand.name} — ${profile.displayName || username}'s Inventory`,
    description: `All ${brand.name} items in ${username}'s inventory.`,
  };
}

export default async function BrandPage({ params }: Props) {
  const { username, slug } = await params;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username),
  });

  if (!profile) notFound();

  const brand = await db.query.brands.findFirst({
    where: eq(brands.slug, slug),
  });

  if (!brand) notFound();

  const brandItems = await db.query.inventory.findMany({
    where: and(
      eq(inventory.userId, profile.id),
      eq(inventory.brandId, brand.id),
      eq(inventory.isPublic, true)
    ),
    orderBy: [desc(inventory.acquiredAt)],
    with: { brand: true },
  });

  const items = brandItems.map(toItem);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link
            href={`/u/${username}`}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            &larr; Back to inventory
          </Link>
          <h1 className="text-xl font-semibold tracking-tight mt-3">
            {brand.name}
          </h1>
          {brand.url && (
            <a
              href={brand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {brand.url}
            </a>
          )}
        </div>

        <ItemGridClient items={items} />
      </div>
    </div>
  );
}
