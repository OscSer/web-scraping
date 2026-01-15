import type { FastifyBaseLogger } from "fastify";
import { SteamDetailsApiClient } from "./steam-details-api-client.js";
import { SteamReviewsApiClient } from "./steam-reviews-api-client.js";
import { createCache } from "../../../shared/utils/cache-factory.js";

const STEAM_GAME_DATA_CACHE_TTL_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

interface GameData {
  name: string;
  score: number;
}

class SteamUnifiedApiClient {
  private logger: FastifyBaseLogger;
  private steamGameDataCache;
  private steamDetailsApiClient: SteamDetailsApiClient;
  private steamReviewsApiClient: SteamReviewsApiClient;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
    this.steamGameDataCache = createCache<GameData>(
      STEAM_GAME_DATA_CACHE_TTL_MS,
      logger
    );
    this.steamDetailsApiClient = new SteamDetailsApiClient(logger);
    this.steamReviewsApiClient = new SteamReviewsApiClient(logger);
  }

  async getGameData(appId: string): Promise<GameData> {
    const cacheKey = `steam:${appId}`;

    const result = await this.steamGameDataCache.getOrFetch(
      cacheKey,
      async () => {
        const [nameResult, scoreResult] = await Promise.allSettled([
          this.steamDetailsApiClient.getGameNameByAppId(appId),
          this.steamReviewsApiClient.getScoreByAppId(appId),
        ]);

        const gameName =
          nameResult.status === "fulfilled" ? nameResult.value : "Unknown Name";

        if (nameResult.status === "rejected") {
          this.logger.warn(
            { err: nameResult.reason, appId },
            "Failed to fetch game name, using fallback"
          );
        }

        let finalScore = 0;

        if (scoreResult.status === "rejected") {
          this.logger.warn(
            { err: scoreResult.reason, appId },
            "Failed to fetch score, using fallback value 0"
          );
        } else if (scoreResult.value === null) {
          this.logger.warn(
            { appId },
            "Score returned null, using fallback value 0"
          );
        } else {
          finalScore = scoreResult.value.score;
        }

        return {
          name: gameName,
          score: finalScore,
        };
      }
    );

    return result;
  }
}

export function createSteamUnifiedApiClient(logger: FastifyBaseLogger) {
  return new SteamUnifiedApiClient(logger);
}
