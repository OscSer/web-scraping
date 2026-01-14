import { createCache } from "../../../shared/utils/cache-factory.js";
import { globalRateLimiter } from "../../../shared/utils/global-rate-limiter.js";
import { normalizeTicker } from "../../../shared/utils/string-helpers.js";
import { USER_AGENT } from "../../../shared/config/index.js";

const TRADINGVIEW_API_URL = "https://scanner.tradingview.com/symbol";
const TRADINGVIEW_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

interface TradingViewResponse {
  close?: number;
}

interface TradingViewTickerResult {
  ticker: string;
  price: number;
  source: "tradingview";
}

const tradingViewCache = createCache<number>(TRADINGVIEW_CACHE_TTL_MS);

class TradingViewClient {
  async getPriceByTicker(
    ticker: string,
  ): Promise<TradingViewTickerResult | null> {
    const normalizedTicker = normalizeTicker(ticker);
    if (!normalizedTicker) return null;

    const cacheKey = normalizedTicker.toUpperCase();

    try {
      const price = await tradingViewCache.getOrFetch(cacheKey, async () => {
        const symbol = `BVC:${normalizedTicker.toUpperCase()}`;
        const url = new URL(TRADINGVIEW_API_URL);
        url.searchParams.set("symbol", symbol);
        url.searchParams.set("fields", "close");
        url.searchParams.set("no_404", "true");

        const response = await globalRateLimiter(() =>
          fetch(url.toString(), {
            headers: {
              "user-agent": USER_AGENT,
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
        ticker: normalizedTicker.toUpperCase(),
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
