import { steamDetailsApiClient } from "./steam-details-api-client.js";
import { steamReviewsApiClient } from "./steam-reviews-api-client.js";
import { logger } from "../../../shared/utils/logger.js";
import { createCache } from "../../../shared/utils/cache-factory.js";

const STEAM_GAME_DATA_CACHE_TTL_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

interface GameData {
  name: string;
  score: number;
}

const steamGameDataCache = createCache<GameData>(STEAM_GAME_DATA_CACHE_TTL_MS);

class SteamUnifiedApiClient {
  async getGameData(appId: string): Promise<GameData> {
    const cacheKey = `steam-game-data-${appId}`;

    const result = await steamGameDataCache.getOrFetch(cacheKey, async () => {
      const [nameResult, scoreResult] = await Promise.allSettled([
        steamDetailsApiClient.getGameNameByAppId(appId),
        steamReviewsApiClient.getScoreByAppId(appId),
      ]);

      const gameName =
        nameResult.status === "fulfilled" ? nameResult.value : "Unknown Name";

      if (nameResult.status === "rejected") {
        logger.warn(
          { err: nameResult.reason, appId },
          "[SteamUnifiedClient] Failed to fetch game name, using fallback",
        );
      }

      let finalScore = 0;

      if (scoreResult.status === "rejected") {
        logger.warn(
          { err: scoreResult.reason, appId },
          "[SteamUnifiedClient] Failed to fetch score, using fallback value 0",
        );
      } else if (scoreResult.value === null) {
        logger.warn(
          { appId },
          "[SteamUnifiedClient] Score returned null, using fallback value 0",
        );
      } else {
        finalScore = scoreResult.value.score;
      }

      return {
        name: gameName,
        score: finalScore,
      };
    });

    return result;
  }
}

export const steamUnifiedApiClient = new SteamUnifiedApiClient();
