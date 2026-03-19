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
      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <div className="w-14 h-14 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center text-lg font-semibold text-foreground">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName || profile.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initial.toUpperCase()
            )}
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            @{profile.username}
          </p>
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              {profile.bio}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-3">
            {items.length} objects
          </p>
        </motion.div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No public objects yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6">
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
