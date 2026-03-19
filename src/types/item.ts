import type { Inventory, Brand } from "@/lib/db/schema";

export interface Item {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  visibility: "public" | "private";
  notes: string | null;
  created_at: string;
  imageUrl: string | null;
}

export interface ItemProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export function toItem(inv: Inventory & { brand: Brand | null }): Item {
  return {
    id: inv.id,
    user_id: inv.userId,
    name: inv.name,
    brand: inv.brand?.name ?? null,
    category: inv.category,
    visibility: inv.isPublic ? "public" : "private",
    notes: inv.description,
    created_at: inv.acquiredAt.toISOString(),
    imageUrl: inv.imageUrl,
  };
}
