"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  uploadObjectImage,
  deleteObjectImage,
  setObjectCoverImage,
} from "@/actions/images";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ObjectImage } from "@/lib/db/schema";

interface ImageManagerProps {
  objectId: string;
  images: ObjectImage[];
  coverImageId?: string | null;
}

export function ImageManager({ objectId, images, coverImageId }: ImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [coveringId, setCoveringId] = useState<string | null>(null);
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

  async function handleSetCover(imageId: string) {
    setCoveringId(imageId);
    const result = await setObjectCoverImage(objectId, imageId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Cover image updated");
    }
    setCoveringId(null);
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
              <div className="flex items-center gap-2">
                {coverImageId !== img.id && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetCover(img.id)}
                    disabled={coveringId === img.id}
                  >
                    {coveringId === img.id ? "..." : "Set cover"}
                  </Button>
                )}
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
            {coverImageId === img.id && (
              <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                Cover
              </span>
            )}
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
