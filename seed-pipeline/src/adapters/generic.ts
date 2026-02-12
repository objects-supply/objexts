import type { Page } from "playwright";
import type { SiteAdapter, RawProduct } from "./types.js";

/**
 * Generic site adapter that works on most e-commerce sites.
 * Uses common DOM patterns to extract product data.
 * This is the fallback when no site-specific adapter matches.
 */
export const genericAdapter: SiteAdapter = {
  name: "generic",

  matchesUrl: () => true, // fallback - matches everything

  async extractProducts(page: Page): Promise<RawProduct[]> {
    return page.evaluate(() => {
      const getText = (selectors: string[]): string | undefined => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) return el.textContent.trim();
        }
        return undefined;
      };

      const getMeta = (names: string[]): string | undefined => {
        for (const name of names) {
          const el =
            document.querySelector(`meta[property="${name}"]`) ??
            document.querySelector(`meta[name="${name}"]`);
          const content = el?.getAttribute("content")?.trim();
          if (content) return content;
        }
        return undefined;
      };

      // Extract product name
      const name =
        getMeta(["og:title", "twitter:title"]) ??
        getText(["h1", "[data-testid='product-title']", ".product-title", ".product-name"]);

      if (!name) return [];

      // Extract price
      const priceText =
        getMeta(["product:price:amount"]) ??
        getText([
          "[data-testid='product-price']",
          ".product-price",
          ".price",
          "[itemprop='price']",
          ".offer-price",
        ]);

      let price: string | undefined;
      if (priceText) {
        const match = priceText.match(/[\d,]+\.?\d*/);
        if (match) price = match[0].replace(/,/g, "");
      }

      // Extract brand
      const brand =
        getMeta(["product:brand"]) ??
        getText([
          "[itemprop='brand']",
          ".product-brand",
          ".brand-name",
          "[data-testid='product-brand']",
        ]);

      // Extract description
      const description =
        getMeta(["og:description", "description", "twitter:description"]) ??
        getText([
          "[itemprop='description']",
          ".product-description",
          ".product-detail",
        ]);

      // Extract category from breadcrumbs
      const breadcrumbs = Array.from(
        document.querySelectorAll(
          "nav[aria-label='breadcrumb'] a, .breadcrumb a, [data-testid='breadcrumb'] a"
        )
      );
      const category = breadcrumbs.length > 1
        ? breadcrumbs
            .slice(1) // skip "Home"
            .map((el) => el.textContent?.trim())
            .filter(Boolean)
            .join(" > ")
        : undefined;

      // Extract image
      const imageUrl =
        getMeta(["og:image"]) ??
        document.querySelector<HTMLImageElement>(".product-image img, [itemprop='image']")?.src;

      // Extract URL
      const url =
        getMeta(["og:url"]) ??
        document.querySelector<HTMLLinkElement>("link[rel='canonical']")?.href ??
        window.location.href;

      const product: RawProduct = {
        name,
        brand: brand || undefined,
        url,
        description: description?.slice(0, 500),
        price,
        category: category || undefined,
        imageUrl: imageUrl || undefined,
      };

      return [product];
    }) as Promise<RawProduct[]>;
  },

  async getProductLinks(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const links = new Set<string>();

      // Common product link patterns
      const selectors = [
        "a[href*='/product']",
        "a[href*='/p/']",
        "a[href*='/dp/']",          // Amazon
        "a[href*='/ip/']",          // Walmart
        "a[href*='/shop/']",
        ".product-card a",
        ".product-tile a",
        ".product-item a",
        "[data-testid='product-card'] a",
        ".grid a[href]",
      ];

      for (const sel of selectors) {
        document.querySelectorAll<HTMLAnchorElement>(sel).forEach((a) => {
          if (a.href && a.href.startsWith("http")) {
            links.add(a.href);
          }
        });
      }

      return Array.from(links);
    });
  },
};
