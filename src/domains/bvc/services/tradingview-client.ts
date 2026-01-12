import { InMemoryCache } from "../../../shared/utils/cache.js";
import { globalRateLimiter } from "../../../shared/utils/global-rate-limiter.js";

const TRADINGVIEW_API_URL = "https://scanner.tradingview.com/symbol";
const TRADINGVIEW_CACHE_TTL_MS = 5 * 60 * 1000;

interface TradingViewResponse {
  close?: number;
  volume?: number;
  change?: number;
  change_abs?: number;
  high?: number;
  low?: number;
  open?: number;
  description?: string;
}

export interface TradingViewTickerResult {
  ticker: string;
  price: number;
  source: "tradingview";
}

const tradingViewCache = new InMemoryCache<number>(TRADINGVIEW_CACHE_TTL_MS);

export class TradingViewClient {
  async getPriceByTicker(
    ticker: string,
  ): Promise<TradingViewTickerResult | null> {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (normalizedTicker.length === 0) return null;

    const cacheKey = normalizedTicker;

    try {
      const price = await tradingViewCache.getOrFetch(cacheKey, async () => {
        const symbol = `BVC:${normalizedTicker}`;
        const url = new URL(TRADINGVIEW_API_URL);
        url.searchParams.set("symbol", symbol);
        url.searchParams.set("fields", "close");
        url.searchParams.set("no_404", "true");

        const response = await globalRateLimiter(() =>
          fetch(url.toString(), {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
              accept: "application/json",
              origin: "https://es.tradingview.com",
              referer: "https://es.tradingview.com/",
            },
          }),
        );

        if (!response.ok) {
          throw new Error(
            `TRADINGVIEW_FETCH_ERROR: ${response.status} ${response.statusText}`,
          );
        }

        const data = (await response.json()) as TradingViewResponse;

        if (typeof data.close === "number" && Number.isFinite(data.close)) {
          return data.close;
        }

        throw new Error("TICKER_NOT_FOUND");
      });

      return {
        ticker: normalizedTicker,
        price,
        source: "tradingview",
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("TRADINGVIEW_FETCH_ERROR")
      ) {
        throw error;
      }
      return null;
    }
  }
}

export const tradingViewClient = new TradingViewClient();
