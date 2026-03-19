"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createObject } from "@/actions/objects";
import { toast } from "sonner";

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

const steps = ["Details", "Options", "Notes"];

export function AddItemModal({ open, onClose, onAdded }: AddItemModalProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    brand: "",
    category: "other",
    visibility: "public",
    imageUrl: "",
    notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleClose = () => {
    setStep(0);
    setForm({
      name: "",
      brand: "",
      category: "other",
      visibility: "public",
      imageUrl: "",
      notes: "",
    });
    onClose();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("brandName", form.brand);
      formData.set("category", form.category);
      formData.set("imageUrl", form.imageUrl);
      formData.set("description", form.notes);
      formData.set("isPublic", form.visibility === "public" ? "true" : "false");

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add Object
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-1.5 mb-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-secondary"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">{steps[step]}</p>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name</Label>
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
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => update("category", v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech">Tech</SelectItem>
                  <SelectItem value="kicks">Kicks</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(v) => update("visibility", v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Image URL (optional)</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => update("imageUrl", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Add details about this object..."
                rows={4}
                className="mt-1 resize-none"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          {step > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}
          {step < steps.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !form.name}
            >
              Continue
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? "Adding..." : "Add to Vault"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
