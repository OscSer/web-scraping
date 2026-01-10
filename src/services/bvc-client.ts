import { config } from "../config/index.js";
import { BvcLvl2Response, TickerData } from "../types/index.js";
import { getCurrentTradeDate, sleep } from "../utils/helpers.js";
import { tokenManager } from "./token-manager.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function isRetriableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export class BvcClient {
  async fetchLvl2Data(board = "MGC"): Promise<BvcLvl2Response> {
    const tradeDate = getCurrentTradeDate();

    const params = new URLSearchParams({
      "filters[marketDataRv][tradeDate]": tradeDate,
      "filters[marketDataRv][board]": board,
      "sorter[]": "tradeValue",
    });
    params.append("sorter[]", "DESC");

    const queryString = params.toString();
    const url = `${config.bvc.restApiUrl}/market-information/rv/lvl-2?${queryString}`;
    const kSource = queryString.length > 0 ? queryString : "undefined";
    const kHeader = Buffer.from(kSource).toString("base64");

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

    let token = await tokenManager.getToken();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          headers: buildHeaders(token),
        });

        if (response.status === 401) {
          console.log("[BvcClient] Invalid or expired token, renewing...");
          await tokenManager.invalidateToken();

          token = await tokenManager.getToken();

          const retryResponse = await fetch(url, {
            headers: buildHeaders(token),
          });

          if (!retryResponse.ok) {
            if (
              isRetriableStatus(retryResponse.status) &&
              attempt < MAX_RETRIES - 1
            ) {
              console.log(
                `[BvcClient] Error ${retryResponse.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`,
              );
              await sleep(RETRY_DELAY_MS * (attempt + 1));
              lastError = new Error(
                `BVC API error: ${retryResponse.status} ${retryResponse.statusText}`,
              );
              continue;
            }

            throw new Error(
              `BVC API error: ${retryResponse.status} ${retryResponse.statusText}`,
            );
          }

          return retryResponse.json() as Promise<BvcLvl2Response>;
        }

        if (response.ok) {
          return response.json() as Promise<BvcLvl2Response>;
        }

        if (isRetriableStatus(response.status) && attempt < MAX_RETRIES - 1) {
          console.log(
            `[BvcClient] Error ${response.status}, retrying (${attempt + 1}/${MAX_RETRIES})...`,
          );
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          lastError = new Error(
            `BVC API error: ${response.status} ${response.statusText}`,
          );
          continue;
        }

        throw new Error(
          `BVC API error: ${response.status} ${response.statusText}`,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("BVC API error")
        ) {
          throw error;
        }

        if (attempt < MAX_RETRIES - 1) {
          console.log(
            `[BvcClient] Network error, retrying (${attempt + 1}/${MAX_RETRIES})...`,
          );
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }

        throw new Error(
          `Network error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    throw lastError || new Error("BVC API error: max retries exceeded");
  }

  async getTickerData(mnemonic: string): Promise<TickerData | null> {
    const data = await this.fetchLvl2Data();
    const normalizedMnemonic = mnemonic.toLowerCase();

    const ticker = data.data.tab.find(
      (item) => item.mnemonic.toLowerCase() === normalizedMnemonic,
    );

    if (!ticker) {
      return null;
    }

    const tradeDate = getCurrentTradeDate();

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
}

export const bvcClient = new BvcClient();
