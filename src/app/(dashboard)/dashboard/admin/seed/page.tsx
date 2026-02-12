"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { scrapeAndSeed } from "@/actions/seed";

interface SeedProduct {
  name: string;
  brand?: string;
  price?: string;
  category?: string;
  status: "inserted" | "skipped" | "error";
}

interface SeedResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: Array<{ url: string; error: string }>;
  products: SeedProduct[];
}

export default function AdminSeedPage() {
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  async function handleScrape() {
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && u.startsWith("http"));

    if (urlList.length === 0) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await scrapeAndSeed(urlList);
      setResult(res);
    } catch (err) {
      setResult({
        success: false,
        inserted: 0,
        skipped: 0,
        errors: [
          {
            url: "pipeline",
            error: err instanceof Error ? err.message : String(err),
          },
        ],
        products: [],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">
          Seed Offered Objects
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scrape product data from URLs and add to the offered objects catalog.
          Uses JSON-LD extraction (Schema.org Product markup).
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-4 mb-8">
        <Textarea
          placeholder={"Paste product URLs here, one per line...\n\nhttps://example.com/product-1\nhttps://example.com/product-2"}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={6}
          className="font-mono text-sm"
          disabled={loading}
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleScrape} disabled={loading || !urls.trim()}>
            {loading ? "Scraping..." : "Scrape & Seed"}
          </Button>
          {loading && (
            <span className="text-sm text-muted-foreground animate-pulse">
              Processing URLs...
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Inserted:</span>
              <Badge variant="default">{result.inserted}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Skipped:</span>
              <Badge variant="secondary">{result.skipped}</Badge>
            </div>
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Errors:</span>
                <Badge variant="destructive">{result.errors.length}</Badge>
              </div>
            )}
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-destructive">Errors</h3>
              {result.errors.map((err, i) => (
                <div
                  key={i}
                  className="text-sm bg-destructive/10 text-destructive rounded-md px-3 py-2 font-mono"
                >
                  <span className="font-semibold">{err.url}:</span> {err.error}
                </div>
              ))}
            </div>
          )}

          {/* Products */}
          {result.products.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Products</h3>
              <div className="border rounded-md divide-y">
                {result.products.map((product, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[product.brand, product.category, product.price ? `$${product.price}` : null]
                          .filter(Boolean)
                          .join(" · ") || "No details"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        product.status === "inserted"
                          ? "default"
                          : product.status === "skipped"
                            ? "secondary"
                            : "destructive"
                      }
                      className="ml-4 shrink-0"
                    >
                      {product.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          <p className="text-xs text-muted-foreground">
            Only JSON-LD (Schema.org Product) extraction is available here. For
            full DOM scraping with Playwright, use the CLI:{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              cd seed-pipeline && npm run scrape -- --url &quot;...&quot;
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
