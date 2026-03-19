"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ItemCard } from "@/components/item-card";
import { ItemCardSkeleton } from "@/components/item-card-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ItemDetailDrawer } from "@/components/item-detail-drawer";
import { AddItemModal } from "@/components/add-item-modal";
import { FilterBar } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { deleteObject } from "@/actions/objects";
import { signOut } from "@/actions/auth";
import type { Item } from "@/types/item";

interface VaultClientProps {
  items: Item[];
  username: string | null;
}

export function VaultClient({ items, username }: VaultClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const filteredItems =
    activeCategory === "all"
      ? items
      : items.filter((item) => item.category === activeCategory);

  const handleShare = () => {
    if (!username) {
      toast.error("Set a username in settings to get a shareable link.");
      return;
    }
    const link = `${window.location.origin}/u/${username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied!", { description: link });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteObject(id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Object deleted.");
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium tracking-tight text-foreground">
              Inventory
            </span>
            {username && (
              <span className="text-xs text-muted-foreground">
                @{username}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full px-3 text-xs font-medium gap-1.5"
              onClick={handleShare}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied" : "Share"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full px-3 text-xs font-medium gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Object
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full p-0"
              onClick={() => signOut()}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {items.length > 0 && (
          <div className="px-4 sm:px-6 pb-3">
            <FilterBar
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>
        )}
      </header>

      <main className="px-3 sm:px-4 py-3 sm:py-4">
        {filteredItems.length === 0 && items.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
            {filteredItems.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                index={i}
                onClick={setSelectedItem}
              />
            ))}
          </div>
        )}
      </main>

      <ItemDetailDrawer
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDelete}
      />
      <AddItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => router.refresh()}
      />
    </div>
  );
}

export function VaultSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <span className="text-sm font-medium tracking-tight text-foreground">
            Inventory
          </span>
        </div>
      </header>
      <main className="px-3 sm:px-4 py-3 sm:py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
