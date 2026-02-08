import type { FastifyBaseLogger } from "fastify";
import { buildFetchHeaders, fetchWithTimeout } from "../../../shared/utils/api-helpers.js";
import { type RateLimiter, createRateLimiter } from "../../../shared/utils/global-rate-limiter.js";
import { SteamFetchError, SteamParseError } from "../types/errors.js";

interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: {
      name?: string;
    };
  };
}

export class SteamDetailsApiClient {
  private rateLimiter: RateLimiter;

  constructor(_logger: FastifyBaseLogger) {
    this.rateLimiter = createRateLimiter(10);
    void _logger;
  }

  async getGameNameByAppId(appId: string): Promise<string> {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

    const response = await this.rateLimiter(() =>
      fetchWithTimeout(url, {
        headers: buildFetchHeaders({
          Accept: "application/json",
        }),
      }),
    );

    if (!response.ok) {
      throw new SteamFetchError(
        `Failed to fetch Steam app details for app ${appId}`,
        response.status,
        response.statusText,
      );
    }

    const data = (await response.json()) as SteamAppDetailsResponse;

    const appData = data[appId];
    if (!appData) {
      throw new SteamParseError(`Steam API returned no data for app ${appId}`);
    }

    if (!appData.success || !appData.data) {
      throw new SteamParseError(`Steam API returned success=false for app ${appId}`);
    }

    const gameName = appData.data.name;
    if (!gameName || typeof gameName !== "string") {
      throw new SteamParseError(`Steam API returned invalid name for app ${appId}`);
    }

    return gameName;
  }
}
