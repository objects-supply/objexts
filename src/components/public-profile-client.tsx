"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ItemCard } from "@/components/item-card";
import { ItemDetailDrawer } from "@/components/item-detail-drawer";
import type { Item, ItemProfile } from "@/types/item";

interface PublicProfileClientProps {
  profile: ItemProfile;
  items: Item[];
}

export function PublicProfileClient({
  profile,
  items,
}: PublicProfileClientProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const initial = profile.displayName?.charAt(0) || profile.username.charAt(0);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col gap-4 border-b border-border/60 pb-6 sm:mb-10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-base font-semibold text-foreground">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || profile.username}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initial.toUpperCase()
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Inventory
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {profile.displayName || profile.username}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                @{profile.username}
              </p>
            </div>
          </div>

          <div className="sm:max-w-md sm:text-right">
            {profile.bio && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            )}
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
              {items.length} objects
            </p>
          </div>
        </motion.div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No public objects yet.
          </p>
        ) : (
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
        )}
      </div>

      <ItemDetailDrawer
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
