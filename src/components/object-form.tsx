"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createObject, updateObject } from "@/actions/objects";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ObjectItem } from "@/lib/db/schema";

interface ObjectFormProps {
  object?: ObjectItem | null;
  brands?: { id: string; name: string }[];
}

export function ObjectForm({ object, brands = [] }: ObjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<
    { key: string; value: string }[]
  >(
    object?.customFields
      ? Object.entries(object.customFields).map(([key, value]) => ({
          key,
          value,
        }))
      : []
  );

  const isEdit = !!object;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    // Add custom fields as JSON
    if (customFields.length > 0) {
      const fields: Record<string, string> = {};
      customFields.forEach(({ key, value }) => {
        if (key.trim()) fields[key.trim()] = value;
      });
      formData.set("customFields", JSON.stringify(fields));
    }

    const result = isEdit
      ? await updateObject(object.id, formData)
      : await createObject(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      toast.success(isEdit ? "Object updated" : "Object created");
      router.push("/dashboard");
    }
  }

  function addCustomField() {
    setCustomFields([...customFields, { key: "", value: "" }]);
  }

  function removeCustomField(index: number) {
    setCustomFields(customFields.filter((_, i) => i !== index));
  }

  function updateCustomField(
    index: number,
    field: "key" | "value",
    val: string
  ) {
    const updated = [...customFields];
    updated[index][field] = val;
    setCustomFields(updated);
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-xl">
      {/* Name + Brand row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brandName">Brand</Label>
          <Input
            id="brandName"
            name="brandName"
            placeholder="Apple"
            defaultValue={object?.brandName ?? ""}
            list="brand-suggestions"
          />
          <datalist id="brand-suggestions">
            {brands.map((b) => (
              <option key={b.id} value={b.name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">
            Product Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="MacBook Pro 16&quot;"
            defaultValue={object?.name ?? ""}
            required
          />
        </div>
      </div>

      {/* Product URL */}
      <div className="space-y-2">
        <Label htmlFor="productUrl">Product URL</Label>
        <Input
          id="productUrl"
          name="productUrl"
          type="url"
          placeholder="https://apple.com/macbook-pro"
          defaultValue={object?.productUrl ?? ""}
        />
      </div>

      {/* Acquisition Type + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Acquisition</Label>
          <Select
            name="acquisitionType"
            defaultValue={object?.acquisitionType ?? "Purchased"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Purchased">Purchased</SelectItem>
              <SelectItem value="Gifted">Gifted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acquiredAt">Date Acquired</Label>
          <Input
            id="acquiredAt"
            name="acquiredAt"
            type="date"
            defaultValue={
              object?.acquiredAt
                ? new Date(object.acquiredAt).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0]
            }
          />
        </div>
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Input
          id="reason"
          name="reason"
          placeholder="Seasonal; Needed; Upgrade"
          defaultValue={object?.reason ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Why you got this. Separate multiple reasons with semicolons.
        </p>
      </div>

      {/* Quantity + Price + Category */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            defaultValue={object?.quantity ?? 1}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            placeholder="0.00"
            defaultValue={object?.price ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            placeholder="Tech"
            defaultValue={object?.category ?? ""}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Notes about this object..."
          rows={3}
          defaultValue={object?.description ?? ""}
        />
      </div>

      {/* Custom Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Custom Fields</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addCustomField}
          >
            + Add field
          </Button>
        </div>
        {customFields.map((field, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Key"
              value={field.key}
              onChange={(e) => updateCustomField(i, "key", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={field.value}
              onChange={(e) => updateCustomField(i, "value", e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCustomField(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              &times;
            </Button>
          </div>
        ))}
      </div>

      {/* Visibility (edit only) */}
      {isEdit && (
        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select
            name="isPublic"
            defaultValue={object?.isPublic ? "true" : "false"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Public</SelectItem>
              <SelectItem value="false">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save changes"
              : "Add object"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
