"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Item } from "@/types/item";

interface ItemDetailDrawerProps {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function ItemDetailDrawer({
  item,
  open,
  onClose,
  onDelete,
}: ItemDetailDrawerProps) {
  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        {item.imageUrl && (
          <div className="aspect-[4/3] w-full bg-secondary">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-6">
          <SheetHeader className="text-left mb-4">
            <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
              {item.brand}
            </p>
            <SheetTitle className="text-xl font-semibold">
              {item.name}
            </SheetTitle>
          </SheetHeader>

          <div className="flex gap-2 mb-6">
            {item.category && (
              <Badge
                variant="secondary"
                className="rounded-full text-xs font-medium capitalize"
              >
                {item.category}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="rounded-full text-xs font-medium capitalize"
            >
              {item.visibility}
            </Badge>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Notes
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {item.notes || "No notes."}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Added
              </p>
              <p className="text-sm text-foreground">
                {format(new Date(item.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {onDelete && (
            <div className="mt-8">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                onClick={() => {
                  onDelete(item.id);
                  onClose();
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
