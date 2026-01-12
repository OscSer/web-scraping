import { GameScore } from "../types/game.js";
import { steamReviewsApiClient } from "./steam-reviews-api-client.js";
import { steamDetailsApiClient } from "./steam-details-api-client.js";
import { logger } from "../../../shared/utils/logger.js";

export class GameScoreService {
  async getScoreByAppId(appId: string): Promise<GameScore | null> {
    const gameName = await steamDetailsApiClient.getGameNameByAppId(appId);

    try {
      const scoreResult = await steamReviewsApiClient.getScoreByAppId(appId);

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
        "[Game] Failed to fetch game info from Steam API",
      );
      throw error;
    }
  }
}

export const gameScoreService = new GameScoreService();
