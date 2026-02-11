"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { uploadObjectImage, deleteObjectImage } from "@/actions/images";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ObjectImage } from "@/lib/db/schema";

interface ImageManagerProps {
  objectId: string;
  images: ObjectImage[];
}

export function ImageManager({ objectId, images }: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadObjectImage(objectId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Image uploaded");
    }
    setUploading(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm("Delete this image?")) return;
    setDeletingId(imageId);
    const result = await deleteObjectImage(imageId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Image deleted");
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative group rounded-lg overflow-hidden border">
            <Image
              src={img.url}
              alt=""
              width={300}
              height={300}
              className="w-full h-40 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
              >
                {deletingId === img.id ? "..." : "Delete"}
              </Button>
            </div>
          </div>
        ))}
      </div>

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
          {uploading ? "Uploading..." : "Upload image"}
        </Button>
      </div>
    </div>
  );
}
