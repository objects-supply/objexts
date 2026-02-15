"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  uploadInventoryImage,
  deleteInventoryImage,
} from "@/actions/images";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageManagerProps {
  inventoryId: string;
  imageUrl?: string | null;
}

export function ImageManager({ inventoryId, imageUrl }: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadInventoryImage(inventoryId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Image uploaded");
    }
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this image?")) return;
    setDeleting(true);
    const result = await deleteInventoryImage(inventoryId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Image deleted");
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-4">
      {imageUrl && (
        <div className="relative group rounded-lg overflow-hidden border">
          <Image
            src={imageUrl}
            alt=""
            width={300}
            height={300}
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "..." : "Delete"}
            </Button>
          </div>
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          id="image-upload"
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : imageUrl ? "Replace image" : "Upload image"}
        </Button>
      </div>
    </div>
  );
}
