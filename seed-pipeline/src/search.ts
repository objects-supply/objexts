import { chromium, type Browser } from "playwright";
import { log } from "./utils.js";

const SEARCH_DELAY_MS = 1000;

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
    }
    return browser;
}

export async function closeDdgsService(): Promise<void> {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

export async function searchProductImages(
    name: string,
    brand: string | null,
    maxResults: number = 5
): Promise<string[]> {
    const query = brand ? `${name} ${brand} product` : `${name} product`;
    log("debug", `Searching Google Images for: "${query}"`);
    try {
        const b = await getBrowser();
        const page = await b.newPage();
        await page.setExtraHTTPHeaders({
            "Accept-Language": "en-US,en;q=0.9",
        });
        const encodedQuery = encodeURIComponent(query);
        const searchUrl = `https://www.google.com/search?q=${encodedQuery}&tbm=isch&safe=active`;
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1000);
        const imageUrls = await page.evaluate(() => {
            const urls: string[] = [];
            const scripts = document.querySelectorAll("script");
            for (const script of scripts) {
                const content = script.textContent || "";
                const matches = content.match(/\["(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)(?:\?[^"]*)?)",\d+,\d+\]/gi);
                if (matches) {
                    for (const match of matches) {
                        const urlMatch = match.match(/\["(https?:\/\/[^"]+)"/);
                        if (urlMatch && urlMatch[1]) {
                            const url = urlMatch[1];
                            if (!url.includes("google.com") && !url.includes("gstatic.com")) {
                                urls.push(url);
                            }
                        }
                    }
                }
            }
            return urls;
        });
        await page.close();
        if (imageUrls.length === 0) {
            log("warn", `No images found for: "${query}"`);
            return [];
        }
        const results = imageUrls.slice(0, maxResults);
        log("debug", `Found ${results.length} image(s)`);
        return results;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("warn", `Image search failed for "${query}": ${msg}`);
        return [];
    }
}

export async function searchProductImage(
    name: string,
    brand: string | null
): Promise<string | null> {
    const results = await searchProductImages(name, brand, 1);
    return results[0] ?? null;
}

export async function searchProductImagesWithDelay(
    name: string,
    brand: string | null,
    delayMs: number = SEARCH_DELAY_MS,
    maxResults: number = 5
): Promise<string[]> {
    const results = await searchProductImages(name, brand, maxResults);
    if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
    }
    return results;
}
