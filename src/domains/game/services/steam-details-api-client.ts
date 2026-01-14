import { createCache } from "../../../shared/utils/cache-factory.js";
import { SteamFetchError, SteamParseError } from "../types/errors.js";
import { globalRateLimiter } from "../../../shared/utils/global-rate-limiter.js";
import { USER_AGENT } from "../../../shared/config/index.js";
import { handleSteamError } from "../utils/steam-error-handler.js";

const STEAM_DETAILS_CACHE_TTL_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
const GAME_NAME_PLACEHOLDER = "Unknown Game";

interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: {
      name?: string;
    };
  };
}

const steamDetailsCache = createCache<string>(STEAM_DETAILS_CACHE_TTL_MS);

class SteamDetailsApiClient {
  async getGameNameByAppId(appId: string): Promise<string> {
    const cacheKey = `steam-details-${appId}`;

    try {
      const result = await steamDetailsCache.getOrFetch(cacheKey, async () => {
        const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

        const response = await globalRateLimiter(() =>
          fetch(url, {
            headers: {
              "User-Agent": USER_AGENT,
              Accept: "application/json",
              "Accept-Language": "en-US,en;q=0.5",
            },
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
          throw new SteamParseError(
            `Steam API returned no data for app ${appId}`,
          );
        }

        if (!appData.success || !appData.data) {
          throw new SteamParseError(
            `Steam API returned success=false for app ${appId}`,
          );
        }

        const gameName = appData.data.name;
        if (!gameName || typeof gameName !== "string") {
          throw new SteamParseError(
            `Steam API returned invalid name for app ${appId}`,
          );
        }

        return gameName;
      });

      return result;
    } catch (error) {
      return handleSteamError(
        error,
        appId,
        "game name from Steam Details API",
        GAME_NAME_PLACEHOLDER,
      );
    }
  }
}

export const steamDetailsApiClient = new SteamDetailsApiClient();
