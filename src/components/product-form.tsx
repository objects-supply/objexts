"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createProduct } from "@/actions/objects";
import { uploadProductImage } from "@/actions/images";
import Image from "next/image";

export function ProductForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    function clearImage() {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    function addCustomField() {
        setCustomFields([...customFields, { key: "", value: "" }]);
    }

    function removeCustomField(index: number) {
        setCustomFields(customFields.filter((_, i) => i !== index));
    }

    function updateCustomField(index: number, field: "key" | "value", val: string) {
        const updated = [...customFields];
        updated[index][field] = val;
        setCustomFields(updated);
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        try {
            let imageUrl: string | undefined;

            if (imageFile) {
                const imageFormData = new FormData();
                imageFormData.append("file", imageFile);
                const uploadResult = await uploadProductImage(imageFormData);

                if (uploadResult.error) {
                    setError(uploadResult.error);
                    setLoading(false);
                    return;
                }

                imageUrl = uploadResult.url;
            }

            if (imageUrl) {
                formData.set("imageUrl", imageUrl);
            }

            if (customFields.length > 0) {
                const fields: Record<string, string> = {};
                customFields.forEach(({ key, value }) => {
                    if (key.trim()) fields[key.trim()] = value;
                });
                formData.set("customFields", JSON.stringify(fields));
            }

            const result = await createProduct(formData);

            if (result.error) {
                setError(result.error);
                setLoading(false);
            } else {
                toast.success("Product created");
                router.push("/dashboard");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create product");
            setLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6 max-w-xl">
            <div className="space-y-2">
                <Label htmlFor="name">
                    Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="MacBook Pro 16&quot;"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="brandName">Brand</Label>
                <Input
                    id="brandName"
                    name="brandName"
                    placeholder="Apple"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="productUrl">Product URL</Label>
                <Input
                    id="productUrl"
                    name="productUrl"
                    type="url"
                    placeholder="https://apple.com/macbook-pro"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="image">Product Image</Label>
                <input
                    ref={fileInputRef}
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {imagePreview && (
                    <div className="relative mt-2">
                        <Image
                            src={imagePreview}
                            alt="Preview"
                            width={200}
                            height={200}
                            className="rounded-md object-cover"
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={clearImage}
                            className="mt-2"
                        >
                            Remove image
                        </Button>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                    id="category"
                    name="category"
                    placeholder="Tech"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    name="description"
                    placeholder="Product description..."
                    rows={3}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="defaultPrice">Default Price</Label>
                <Input
                    id="defaultPrice"
                    name="defaultPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                />
            </div>

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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Product"}
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
