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
      className="group relative cursor-pointer"
      onClick={() => onClick(item)}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/55 p-5 sm:p-6 lg:p-7">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-foreground px-3 py-2.5 transition-transform duration-300 group-hover:translate-y-0">
          <p className="text-xs font-medium leading-tight text-primary-foreground">
            <span className="text-primary-foreground/60">
              {item.brand || "Object"}
            </span>{" "}
            {item.name}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
