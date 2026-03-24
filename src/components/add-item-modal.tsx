"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createObject } from "@/actions/objects";
import { toast } from "sonner";
import { ImagePlus, Link2, Upload } from "lucide-react";

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

export function AddItemModal({ open, onClose, onAdded }: AddItemModalProps) {
  const [saving, setSaving] = useState(false);
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    brand: "",
    imageUrl: "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(imageMode === "url" ? form.imageUrl.trim() || null : null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, imageMode, form.imageUrl]);

  const handleClose = () => {
    setForm({
      name: "",
      brand: "",
      imageUrl: "",
    });
    setImageMode("upload");
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("brandName", form.brand);
      formData.set("isPublic", "true");

      if (imageMode === "url" && form.imageUrl.trim()) {
        formData.set("imageUrl", form.imageUrl.trim());
      }

      if (imageMode === "upload" && imageFile) {
        formData.set("imageFile", imageFile);
      }

      const result = await createObject(formData);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${form.name} added to your vault.`);
        onAdded?.();
        handleClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add Object
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Object Name</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="AirPods Max"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Brand</Label>
              <Input
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                placeholder="Apple"
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs">Image</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  imageMode === "upload"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  imageMode === "url"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <Link2 className="h-4 w-4" />
                Image URL
              </button>
            </div>

            {imageMode === "upload" ? (
              <div className="rounded-lg border border-dashed border-border p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imageFile ? "Replace uploaded image" : "Choose image"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Upload a local image for this object.
                </p>
              </div>
            ) : (
              <div>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => update("imageUrl", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Paste a direct image URL.
                </p>
              </div>
            )}

            <div className="overflow-hidden rounded-lg bg-secondary/50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected object preview"
                  className="h-56 w-full object-contain"
                />
              ) : (
                <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    No image selected
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? "Adding..." : "Add to Vault"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
