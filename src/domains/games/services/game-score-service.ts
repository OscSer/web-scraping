import { GameScore } from "../types/game.js";
import { steamReviewsApiClient } from "./steam-reviews-api-client.js";
import { steamDetailsApiClient } from "./steam-details-api-client.js";
import { logger } from "../../../shared/utils/logger.js";

export class GameScoreService {
  async getScoreByAppId(appId: string): Promise<GameScore | null> {
    try {
      const [scoreResult, gameName] = await Promise.all([
        steamReviewsApiClient.getScoreByAppId(appId),
        steamDetailsApiClient.getGameNameByAppId(appId),
      ]);

      if (scoreResult) {
        return {
          score: scoreResult.score,
          name: gameName,
          source: "steam",
        };
      }

      return null;
    } catch (error) {
      logger.error(
        { err: error, appId },
        "[Games] Failed to fetch score from Steam API",
      );
      return null;
    }
  }
}

export const gameScoreService = new GameScoreService();
