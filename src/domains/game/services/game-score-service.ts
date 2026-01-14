import { GameScore } from "../types/game.js";
import { steamReviewsApiClient } from "./steam-reviews-api-client.js";
import { steamDetailsApiClient } from "./steam-details-api-client.js";
import { logger } from "../../../shared/utils/logger.js";

class GameScoreService {
  async getScoreByAppId(appId: string): Promise<GameScore | null> {
    const [nameResult, scoreResult] = await Promise.allSettled([
      steamDetailsApiClient.getGameNameByAppId(appId),
      steamReviewsApiClient.getScoreByAppId(appId),
    ]);

    const gameName =
      nameResult.status === "fulfilled" ? nameResult.value : "Unknown Name";

    if (nameResult.status === "rejected") {
      logger.warn(
        { err: nameResult.reason, appId },
        "[Game] Failed to fetch game name, using fallback",
      );
    }

    let finalScore = 0;

    if (scoreResult.status === "rejected") {
      logger.warn(
        { err: scoreResult.reason, appId },
        "[Game] Failed to fetch score, using fallback value 0",
      );
    } else if (scoreResult.value === null) {
      logger.warn(
        { appId },
        "[Game] Score returned null, using fallback value 0",
      );
    } else {
      finalScore = scoreResult.value.score;
    }

    return {
      score: finalScore,
      name: gameName,
      source: "steam",
    };
  }
}

export const gameScoreService = new GameScoreService();
