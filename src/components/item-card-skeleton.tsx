import { Skeleton } from "@/components/ui/skeleton";

export function ItemCardSkeleton() {
  return (
    <div className="bg-background">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="py-2.5 px-0.5">
        <Skeleton className="h-3.5 w-3/4 rounded-sm" />
      </div>
    </div>
  );
}
