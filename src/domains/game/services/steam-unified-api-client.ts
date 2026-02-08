import type { FastifyBaseLogger } from "fastify";
import { createCache } from "../../../shared/utils/cache-factory.js";
import { SteamDetailsApiClient } from "./steam-details-api-client.js";
import { SteamReviewsApiClient } from "./steam-reviews-api-client.js";

const STEAM_GAME_DATA_CACHE_TTL_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

interface GameData {
  name: string;
  score: number;
}

class SteamUnifiedApiClient {
  private steamGameDataCache;
  private steamDetailsApiClient: SteamDetailsApiClient;
  private steamReviewsApiClient: SteamReviewsApiClient;

  constructor(logger: FastifyBaseLogger) {
    this.steamGameDataCache = createCache<GameData>(STEAM_GAME_DATA_CACHE_TTL_MS, logger);
    this.steamDetailsApiClient = new SteamDetailsApiClient(logger);
    this.steamReviewsApiClient = new SteamReviewsApiClient(logger);
  }

  async getGameData(appId: string): Promise<GameData> {
    const cacheKey = `steam:${appId}`;

    const result = await this.steamGameDataCache.getOrFetch(cacheKey, async () => {
      const [gameName, score] = await Promise.all([
        this.steamDetailsApiClient.getGameNameByAppId(appId),
        this.steamReviewsApiClient.getScoreByAppId(appId),
      ]);

      if (score === null) {
        throw new Error(`Steam score is unavailable for app ${appId}`);
      }

      if (!Number.isFinite(score.score)) {
        throw new Error(`Steam score is invalid for app ${appId}`);
      }

      return {
        name: gameName,
        score: score.score,
      };
    });

    return result;
  }
}

export function createSteamUnifiedApiClient(logger: FastifyBaseLogger) {
  return new SteamUnifiedApiClient(logger);
}
