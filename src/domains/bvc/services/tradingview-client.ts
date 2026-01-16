import type { FastifyBaseLogger } from "fastify";
import { createCache } from "../../../shared/utils/cache-factory.js";
import {
  buildFetchHeaders,
  fetchWithTimeout,
} from "../../../shared/utils/api-helpers.js";
import { normalizeTicker } from "../../../shared/utils/string-helpers.js";
import { BvcFetchError, BvcParseError } from "../types/errors.js";

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

export class TradingViewClient {
  private tradingViewCache;

  constructor(logger: FastifyBaseLogger) {
    this.tradingViewCache = createCache<number>(
      TRADINGVIEW_CACHE_TTL_MS,
      logger,
    );
  }

  async getPriceByTicker(
    ticker: string,
  ): Promise<TradingViewTickerResult | null> {
    const normalizedTicker = normalizeTicker(ticker);
    if (!normalizedTicker) return null;

    const cacheKey = `stock:${normalizedTicker}`;

    try {
      const price = await this.tradingViewCache.getOrFetch(
        cacheKey,
        async () => {
          const symbol = `BVC:${normalizedTicker.toUpperCase()}`;
          const url = new URL(TRADINGVIEW_API_URL);
          url.searchParams.set("symbol", symbol);
          url.searchParams.set("fields", "close");
          url.searchParams.set("no_404", "true");

          const response = await fetchWithTimeout(url.toString(), {
            headers: buildFetchHeaders({
              accept: "application/json",
              origin: "https://es.tradingview.com",
              referer: "https://es.tradingview.com/",
            }),
          });

          if (!response.ok) {
            throw new BvcFetchError(
              "Failed to fetch TradingView ticker",
              response.status,
              response.statusText,
            );
          }

          const data = (await response.json()) as TradingViewResponse;

          if (typeof data.close === "number" && Number.isFinite(data.close)) {
            return data.close;
          }

          throw new BvcParseError("TradingView did not return a valid close");
        },
      );

      return {
        ticker: normalizedTicker.toUpperCase(),
        price,
        source: "tradingview",
      };
    } catch (error) {
      if (error instanceof BvcFetchError || error instanceof BvcParseError) {
        throw error;
      }
      return null;
    }
  }
}
