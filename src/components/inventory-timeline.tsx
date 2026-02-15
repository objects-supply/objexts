import Link from "next/link";
import { relativeTime } from "@/lib/utils/relative-time";
import type { ObjectItem } from "@/lib/db/schema";

interface InventoryTimelineProps {
  objects: ObjectItem[];
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
    <ul className="space-y-6">
      {objects.map((obj) => (
        <li key={obj.id}>
          <InventoryItem object={obj} username={username} />
        </li>
      ))}
    </ul>
  );
}

function InventoryItem({
  object: obj,
  username,
}: {
  object: ObjectItem;
  username: string;
}) {
  return (
    <dl className="[&_dt]:opacity-40 not-last:[&_dd]:mb-1">
      {/* Reason (optional) */}
      {obj.reason && (
        <>
          <dt className="text-xs">Reason</dt>
          <dd className="text-xs opacity-40">{obj.reason}</dd>
        </>
      )}

      {/* Acquisition type */}
      <dt className="text-xs">{obj.acquisitionType}</dt>
      <dd className="text-xs opacity-40 mb-2">
        {relativeTime(obj.acquiredAt)}
      </dd>

      {/* Brand + Product Name */}
      <dd className="text-sm">
        {obj.brandName && obj.brandSlug && (
          <>
            <Link
              href={`/u/${username}/brands/${obj.brandSlug}`}
              className="hover:underline underline-offset-4"
            >
              {obj.brandName}
            </Link>
            <span className="text-muted-foreground">,&nbsp;</span>
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
          <span className="text-muted-foreground">, {obj.quantity}x</span>
        )}
      </dd>
    </dl>
  );
}
