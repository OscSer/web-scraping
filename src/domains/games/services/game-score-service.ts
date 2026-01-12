import { GameScore } from "../types/game.js";
import { steamReviewsApiClient } from "./steam-reviews-api-client.js";
import { logger } from "../../../shared/utils/logger.js";

export class GameScoreService {
  async getScoreByAppId(appId: string): Promise<GameScore | null> {
    try {
      const result = await steamReviewsApiClient.getScoreByAppId(appId);

      if (result) {
        return {
          score: result.score,
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
