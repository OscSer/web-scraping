import { InMemoryCache } from "../../../shared/utils/cache.js";

const TRII_STOCK_LIST_URL = "https://trii.co/stock-list";
const TRII_CACHE_TTL_MS = 5 * 60 * 1000;

type TriiPriceMap = Map<string, number>;

const triiPriceCache = new InMemoryCache<TriiPriceMap>(TRII_CACHE_TTL_MS);

function parsePrice(raw: string): number | null {
  const normalized = raw.replaceAll("$", "").replaceAll(",", "").trim();

  if (normalized.length === 0) return null;

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return null;

  return numeric;
}

function parseTriiStockListHtml(html: string): TriiPriceMap {
  const map: TriiPriceMap = new Map();

  const sectionRegex =
    /<div\s+id="(?:local|global)"[\s\S]*?<\/div>\s*<\/section>/g;

  const sections = html.match(sectionRegex) ?? [html];

  const cardRegex =
    /<h3>\s*([^<\s]+)\s*<\/h3>[\s\S]*?<div\s+class="title">\s*\$\s*([^<]+?)\s*<\/div>/g;

  for (const sectionHtml of sections) {
    let match: RegExpExecArray | null = null;
    while ((match = cardRegex.exec(sectionHtml)) !== null) {
      const ticker = match[1]?.trim().toLowerCase();
      const priceRaw = match[2] ?? "";

      if (!ticker) continue;

      const price = parsePrice(priceRaw);
      if (price === null) continue;

      map.set(ticker, price);
    }
  }

  return map;
}

export class TriiClient {
  async getPriceByTicker(ticker: string): Promise<number | null> {
    const normalizedTicker = ticker.trim().toLowerCase();
    if (normalizedTicker.length === 0) return null;

    const priceMap = await triiPriceCache.getOrFetch("stock-list", async () => {
      const response = await fetch(TRII_STOCK_LIST_URL, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (!response.ok) {
        throw new Error(
          `TRII_FETCH_ERROR: ${response.status} ${response.statusText}`,
        );
      }

      const html = await response.text();
      return parseTriiStockListHtml(html);
    });

    return priceMap.get(normalizedTicker) ?? null;
  }
}

export const triiClient = new TriiClient();
