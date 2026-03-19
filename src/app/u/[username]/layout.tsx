import type { Metadata } from "next";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

export default function PublicProfileLayout({ children }: Props) {
  return <>{children}</>;
}
