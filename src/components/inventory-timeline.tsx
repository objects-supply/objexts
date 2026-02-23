import Link from "next/link";
import { relativeTime } from "@/lib/utils/relative-time";
import type { ObjectItem, Brand, Product } from "@/lib/db/schema";

type ObjectItemWithRelations = ObjectItem & {
  brand?: Brand | null;
  product?: Product | null;
};

interface InventoryTimelineProps {
  objects: ObjectItemWithRelations[];
  username: string;
}

export function InventoryTimeline({
  objects,
  username,
}: InventoryTimelineProps) {
  if (objects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/60">
        No objects shared yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12">
      {objects.map((obj) => (
        <div key={obj.id}>
          <InventoryItem object={obj} username={username} />
        </div>
      ))}
    </div>
  );
}

function InventoryItem({
  object: obj,
  username,
}: {
  object: ObjectItemWithRelations;
  username: string;
}) {
  return (
    <div className="flex flex-col">
      {/* Image */}
      {(obj.imageUrl || obj.product?.imageUrl) && (
        <div className="mb-6">
          <img
            src={obj.product?.imageUrl || obj.imageUrl || undefined}
            alt={obj.name}
            className="w-full aspect-[4/5] object-contain rounded bg-muted/10 p-4"
          />
        </div>
      )}

      {/* Brand + Product Name */}
      <div className="text-sm mb-2">
        {obj.brand && (
          <>
            <Link
              href={`/u/${username}/brands/${obj.brand.slug}`}
              className="hover:underline underline-offset-4 text-muted-foreground"
            >
              {obj.brand.name}
            </Link>
            <br />
          </>
        )}
        {obj.sourceUrl ? (
          <a
            href={obj.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline underline-offset-4"
          >
            {obj.name}
          </a>
        ) : (
          <span>{obj.name}</span>
        )}
        {obj.quantity && obj.quantity > 1 && (
          <span className="text-muted-foreground"> ({obj.quantity}x)</span>
        )}
      </div>

      {/* Acquisition type + date */}
      <div className="text-xs text-muted-foreground">
        {obj.acquisitionType} · {relativeTime(obj.acquiredAt)}
      </div>

      {/* Reason (optional) */}
      {obj.reason && (
        <div className="text-xs text-muted-foreground mt-1">
          {obj.reason}
        </div>
      )}
    </div>
  );
}
