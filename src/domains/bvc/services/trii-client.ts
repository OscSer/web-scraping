import type { FastifyBaseLogger } from "fastify";
import { buildFetchHeaders, fetchWithTimeout } from "../../../shared/utils/api-helpers.js";
import { createCache } from "../../../shared/utils/cache-factory.js";
import { normalizeTicker } from "../../../shared/utils/string-helpers.js";
import { BvcFetchError, BvcParseError } from "../types/errors.js";

const TRII_STOCK_LIST_URL = "https://trii.co/stock-list";
const TRII_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const TRII_CACHE_KEY = "trii-stock-list";

type TriiPriceMap = Record<string, number>;

function parsePrice(raw: string): number | null {
  const normalized = raw.replaceAll("$", "").replaceAll(",", "").trim();

  if (normalized.length === 0) return null;

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return null;

  return numeric;
}

function parseTriiStockListHtml(html: string): TriiPriceMap {
  const map: TriiPriceMap = {};

  const sectionRegex = /<div\s+id="(?:local|global)"[\s\S]*?<\/div>\s*<\/section>/g;

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

      map[ticker] = price;
    }
  }

  if (Object.keys(map).length === 0) {
    throw new BvcParseError("Trii response did not include any prices");
  }

  return map;
}

interface TriiTickerResult {
  ticker: string;
  price: number;
  source: "trii";
}

export class TriiClient {
  private triiCache;

  constructor(logger: FastifyBaseLogger) {
    this.triiCache = createCache<TriiPriceMap>(TRII_CACHE_TTL_MS, logger);
  }

  async getPriceByTicker(ticker: string): Promise<TriiTickerResult | null> {
    const normalizedTicker = normalizeTicker(ticker);
    if (!normalizedTicker) return null;

    const priceMap = await this.triiCache.getOrFetch(TRII_CACHE_KEY, async () => {
      const response = await fetchWithTimeout(TRII_STOCK_LIST_URL, {
        headers: buildFetchHeaders({
          accept: "text/html,application/xhtml+xml",
        }),
      });

      if (!response.ok) {
        throw new BvcFetchError(
          `Failed to fetch Trii stock list`,
          response.status,
          response.statusText,
        );
      }

      const html = await response.text();
      return parseTriiStockListHtml(html);
    });

    const price = priceMap[normalizedTicker] ?? null;
    if (price === null) return null;

    return {
      ticker: normalizedTicker.toUpperCase(),
      price,
      source: "trii",
    };
  }
}
