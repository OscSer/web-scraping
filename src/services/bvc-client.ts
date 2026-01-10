import { config } from "../config/index.js";
import { BvcLvl2Response, TickerData } from "../types/index.js";
import { InMemoryCache } from "../utils/cache.js";
import {
  getCurrentTradeDate,
  getTradeDatesToTry,
  sleep,
} from "../utils/helpers.js";
import { tokenManager } from "./token-manager.js";
import { logger } from "../utils/logger.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const LVL2_CACHE_TTL_MS = 60 * 1000;

const lvl2Cache = new InMemoryCache<BvcLvl2Response>(LVL2_CACHE_TTL_MS);

function isRetriableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export class BvcClient {
  async fetchLvl2Data(options?: {
    board?: string;
    tradeDate?: string;
  }): Promise<BvcLvl2Response> {
    const board = options?.board ?? "MGC";
    const tradeDate = options?.tradeDate ?? getCurrentTradeDate();

    const cacheKey = `${board}:${tradeDate}`;
    const cached = lvl2Cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      "filters[marketDataRv][tradeDate]": tradeDate,
      "filters[marketDataRv][board]": board,
      "sorter[]": "tradeValue",
    });
    params.append("sorter[]", "DESC");

    const queryString = params.toString();
    const url = `${config.bvc.restApiUrl}/market-information/rv/lvl-2?${queryString}`;
    const kHeader = Buffer.from(queryString).toString("base64");

    const baseHeaders = {
      accept: "application/json, text/plain, */*",
      origin: config.bvc.webUrl,
      k: kHeader,
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    };

    const buildHeaders = (token: string) => ({
      ...baseHeaders,
      token,
    });

    const toError = (error: unknown): Error =>
      error instanceof Error ? error : new Error(String(error));

    const toBvcApiError = (response: Response): Error =>
      new Error(`BVC API error: ${response.status} ${response.statusText}`);

    const logAndSleepForRetry = async (attempt: number, message: string) => {
      logger.info(message);
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    };

    const tryRetryForStatus = async (
      response: Response,
      attempt: number,
    ): Promise<"retry" | "no-retry"> => {
      if (!isRetriableStatus(response.status)) {
        return "no-retry";
      }

      if (attempt >= MAX_RETRIES - 1) {
        return "no-retry";
      }

      await logAndSleepForRetry(
        attempt,
        `[BvcClient] Error ${response.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`,
      );
      return "retry";
    };

    const parseAndCache = async (attempt: number): Promise<BvcLvl2Response> => {
      const response = await fetch(url, {
        headers: buildHeaders(token),
      });

      if (response.status === 401) {
        logger.info("[BvcClient] Invalid or expired token, renewing...");
        await tokenManager.invalidateToken();
        token = await tokenManager.getToken();

        const retryResponse = await fetch(url, {
          headers: buildHeaders(token),
        });

        if (retryResponse.ok) {
          const json = (await retryResponse.json()) as BvcLvl2Response;
          lvl2Cache.set(cacheKey, json);
          return json;
        }

        const retryDecision = await tryRetryForStatus(retryResponse, attempt);
        lastError = toBvcApiError(retryResponse);

        if (retryDecision === "retry") {
          await logAndSleepForRetry(
            attempt,
            `[BvcClient] Error ${retryResponse.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`,
          );
          throw lastError;
        }

        throw lastError;
      }

      if (response.ok) {
        const json = (await response.json()) as BvcLvl2Response;
        lvl2Cache.set(cacheKey, json);
        return json;
      }

      const decision = await tryRetryForStatus(response, attempt);
      lastError = toBvcApiError(response);

      if (decision === "retry") {
        throw lastError;
      }

      throw lastError;
    };

    let token = await tokenManager.getToken();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await parseAndCache(attempt);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("BVC API error")
        ) {
          if (attempt < MAX_RETRIES - 1) {
            continue;
          }

          throw error;
        }

        if (attempt < MAX_RETRIES - 1) {
          await logAndSleepForRetry(
            attempt,
            `[BvcClient] Network error, retrying (${attempt + 1}/${MAX_RETRIES})...`,
          );
          lastError = toError(error);
          continue;
        }

        throw new Error(`Network error: ${toError(error).message}`);
      }
    }

    throw lastError || new Error("BVC API error: max retries exceeded");
  }

  async getTickerData(mnemonic: string): Promise<TickerData | null> {
    const normalizedMnemonic = mnemonic.toLowerCase();

    const tradeDatesToTry = getTradeDatesToTry({ maxPreviousBusinessDays: 3 });

    for (const tradeDate of tradeDatesToTry) {
      const data = await this.fetchLvl2Data({ tradeDate });

      const ticker = data.data.tab.find(
        (item) => item.mnemonic.toLowerCase() === normalizedMnemonic,
      );

      if (!ticker) {
        continue;
      }

      return {
        ticker: ticker.mnemonic,
        issuer: ticker.issuer,
        price: ticker.lastPrice,
        volume: ticker.volume,
        quantity: ticker.quantity,
        board: ticker.board,
        tradeDate,
        percentageVariation: ticker.percentageVariation,
        absoluteVariation: ticker.absoluteVariation,
        openPrice: ticker.openPrice,
        maximumPrice: ticker.maximumPrice,
        minimumPrice: ticker.minimumPrice,
        averagePrice: ticker.averagePrice,
      };
    }

    return null;
  }
}

export const bvcClient = new BvcClient();
