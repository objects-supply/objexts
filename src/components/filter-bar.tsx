"use client";

import { cn } from "@/lib/utils";

const categories: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tech", label: "Tech" },
  { value: "kicks", label: "Kicks" },
  { value: "design", label: "Design" },
  { value: "other", label: "Other" },
];

interface FilterBarProps {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
}

export function FilterBar({ activeCategory, onCategoryChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-1">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onCategoryChange(cat.value)}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full transition-colors",
            activeCategory === cat.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
