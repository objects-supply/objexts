import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { removeBackground } from "@imgly/background-removal-node";
import { log } from "./utils.js";
import type { ValidatedProduct } from "./validator.js";

const BUCKET_NAME = "product_images";

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
    if (!supabaseClient) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error(
                "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are required for image uploads."
            );
        }
        supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
    return supabaseClient;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);
}

function hashUrl(url: string): string {
    return createHash("md5").update(url).digest("hex").slice(0, 12);
}

function getExtensionFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const ext = pathname.split(".").pop()?.toLowerCase();
        if (ext && ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) {
            return ext;
        }
    } catch {
        // ignore
    }
    return "jpg";
}

async function imageExistsInBucket(path: string): Promise<boolean> {
    const supabase = getSupabase();
    const folderPath = path.substring(0, path.lastIndexOf("/"));
    const fileName = path.substring(path.lastIndexOf("/") + 1);
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath, { limit: 100, search: fileName });
    if (error) {
        log("debug", `Error checking if image exists: ${error.message}`);
        return false;
    }
    return data?.some((f) => f.name === fileName) ?? false;
}

export interface ImageDownloadResult {
    imageUrl: string | null;
    storagePath: string | null;
}

export async function downloadAndUploadImage(
    externalUrl: string,
    brandName: string | null,
    productName?: string
): Promise<ImageDownloadResult> {
    const supabase = getSupabase();
    const ext = getExtensionFromUrl(externalUrl);
    let storagePath: string;
    if (productName) {
        const nameSlug = slugify(productName);
        storagePath = `${nameSlug}.${ext}`;
    } else {
        const brandSlug = brandName ? slugify(brandName) : "unknown";
        const urlHash = hashUrl(externalUrl);
        storagePath = `catalog/${brandSlug}/${urlHash}.${ext}`;
    }
    if (await imageExistsInBucket(storagePath)) {
        log("debug", `Image already exists: ${storagePath}`);
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
        return { imageUrl: data.publicUrl, storagePath };
    }
    try {
        const response = await fetch(externalUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; ObjectsCatalogBot/1.0)",
                Accept: "image/*",
            },
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${externalUrl}`);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType?.startsWith("image/")) {
            throw new Error(`Not an image (${contentType}): ${externalUrl}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);
        if (buffer.length < 100) {
            throw new Error(`Image too small (${buffer.length} bytes): ${externalUrl}`);
        }
        log("debug", `Removing background from image...`);
        try {
            const blob = new Blob([buffer], { type: contentType || "image/jpeg" });
            const resultBlob = await removeBackground(blob);
            const resultArrayBuffer = await resultBlob.arrayBuffer();
            buffer = Buffer.from(resultArrayBuffer);
            log("debug", `Background removed successfully`);
        } catch (bgErr) {
            const bgMsg = bgErr instanceof Error ? bgErr.message : String(bgErr);
            log("warn", `Background removal failed, using original: ${bgMsg}`);
        }
        const finalContentType = "image/png";
        const finalStoragePath = storagePath.replace(/\.(jpg|jpeg|webp|gif)$/i, ".png");
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(finalStoragePath, buffer, {
                contentType: finalContentType,
                upsert: false,
            });
        if (uploadError) {
            if (uploadError.message.includes("already exists")) {
                log("debug", `Image already exists (race condition): ${finalStoragePath}`);
                const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(finalStoragePath);
                return { imageUrl: data.publicUrl, storagePath: finalStoragePath };
            }
            throw new Error(`Upload failed: ${uploadError.message}`);
        }
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(finalStoragePath);
        log("success", `Uploaded image: ${finalStoragePath}`);
        return { imageUrl: data.publicUrl, storagePath: finalStoragePath };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(msg);
    }
}

export async function downloadImagesForProducts(
    products: ValidatedProduct[],
    concurrency: number = 3,
    delay: number = 500
): Promise<Map<string, string>> {
    const imageMap = new Map<string, string>();
    const productsWithImages = products.filter((p) => p.imageUrl);
    if (productsWithImages.length === 0) {
        log("info", "No products have image URLs to download");
        return imageMap;
    }
    log("info", `Downloading ${productsWithImages.length} product images...`);
    const queue = [...productsWithImages];
    let completed = 0;
    const processNext = async () => {
        while (queue.length > 0) {
            const product = queue.shift()!;
            const result = await downloadAndUploadImage(
                product.imageUrl!,
                product.brand ?? null
            );
            if (result.imageUrl) {
                imageMap.set(product.imageUrl!, result.imageUrl);
            }
            completed++;
            if (completed % 10 === 0) {
                log("info", `Image progress: ${completed}/${productsWithImages.length}`);
            }
            if (queue.length > 0 && delay > 0) {
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    };
    const workers = Array.from({ length: Math.min(concurrency, productsWithImages.length) }, processNext);
    await Promise.all(workers);
    log("info", `Downloaded ${imageMap.size}/${productsWithImages.length} images successfully`);
    return imageMap;
}

export function applyImageUrls(
    products: ValidatedProduct[],
    imageMap: Map<string, string>
): ValidatedProduct[] {
    return products.map((product) => {
        if (product.imageUrl && imageMap.has(product.imageUrl)) {
            return { ...product, imageUrl: imageMap.get(product.imageUrl) };
        }
        return product;
    });
}
