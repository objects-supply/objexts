"use client";

import { useState } from "react";
import { ItemCard } from "@/components/item-card";
import { ItemDetailDrawer } from "@/components/item-detail-drawer";
import type { Item } from "@/types/item";

interface ItemGridClientProps {
  items: Item[];
}

export function ItemGridClient({ items }: ItemGridClientProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No public objects yet.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {items.map((item, i) => (
          <ItemCard
            key={item.id}
            item={item}
            index={i}
            onClick={setSelectedItem}
          />
        ))}
      </div>

      <ItemDetailDrawer
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
