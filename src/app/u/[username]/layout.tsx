import type { Metadata } from "next";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username),
  });

  if (!profile) return { title: "Not Found" };

  const title = profile.displayName
    ? `${profile.displayName}'s Inventory`
    : `${username}'s Inventory`;

  return {
    title,
    description:
      profile.bio || `A curated inventory of objects by ${username}.`,
    openGraph: {
      title,
      description:
        profile.bio || `A curated inventory of objects by ${username}.`,
      type: "website",
    },
  };
}

export default async function PublicProfileLayout({ params, children }: Props) {
  const { username } = await params;

  // Verify user exists
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.username, username),
  });

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-12">
        {children}
      </main>

      <footer className="max-w-xl mx-auto w-full px-6 py-6">
        <p className="text-xs text-muted-foreground/40">
          &copy;{new Date().getFullYear()}, {profile.displayName || username}
        </p>
      </footer>
    </div>
  );
}
