"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteObject } from "@/actions/objects";
import { relativeTime } from "@/lib/utils/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { ObjectItem, ObjectImage } from "@/lib/db/schema";

type ObjectWithImages = ObjectItem & { images: ObjectImage[] };

export function ObjectList({ objects }: { objects: ObjectWithImages[] }) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this object?")) return;
    setDeleting(id);
    const result = await deleteObject(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Object deleted");
    }
    setDeleting(null);
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Object</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden md:table-cell">Acquired</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((obj) => (
            <TableRow key={obj.id}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {obj.brandName && (
                      <span className="text-muted-foreground">
                        {obj.brandName},{" "}
                      </span>
                    )}
                    {obj.name}
                    {obj.quantity && obj.quantity > 1 && (
                      <span className="text-muted-foreground ml-1">
                        {obj.quantity}x
                      </span>
                    )}
                  </div>
                  {obj.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {obj.reason}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="secondary" className="text-xs">
                  {obj.acquisitionType}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {obj.category || "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {relativeTime(obj.acquiredAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/dashboard/objects/${obj.id}`}>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(obj.id)}
                    disabled={deleting === obj.id}
                  >
                    {deleting === obj.id ? "..." : "Delete"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
