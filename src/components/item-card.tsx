"use client";

import { motion } from "framer-motion";
import type { Item } from "@/types/item";

interface ItemCardProps {
  item: Item;
  index: number;
  onClick: (item: Item) => void;
}

export function ItemCard({ item, index, onClick }: ItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="group cursor-pointer relative"
      onClick={() => onClick(item)}
    >
      <div className="aspect-square overflow-hidden bg-secondary flex items-center justify-center p-8 sm:p-10 relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground text-sm">No image</div>
        )}

        {/* Hover bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-foreground translate-y-full group-hover:translate-y-0 transition-transform duration-300 px-3 py-2.5">
          <p className="text-primary-foreground text-xs font-medium leading-tight">
            <span className="text-primary-foreground/60">{item.brand}</span>{" "}
            {item.name}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
