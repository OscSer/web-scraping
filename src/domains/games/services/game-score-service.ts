import { GameScore } from "../types/game.js";
import { steamDBScraper } from "./steamdb-scraper.js";
import { steamScraper } from "./steam-scraper.js";
import { logger } from "../../../shared/utils/logger.js";

export class GameScoreService {
  async getScoreByAppId(appId: string): Promise<GameScore | null> {
    try {
      const steamDBResult = await steamDBScraper.getScoreByAppId(appId);

      if (steamDBResult) {
        return {
          score: parseFloat(steamDBResult.score.toFixed(2)),
          source: "steamdb",
        };
      }
    } catch (error) {
      logger.error(
        { err: error, appId },
        "[Games] SteamDB scraper failed, trying Steam fallback",
      );
    }

    try {
      const steamResult = await steamScraper.getScoreByAppId(appId);

      if (steamResult) {
        return {
          score: parseFloat(steamResult.score.toFixed(2)),
          source: "steam",
        };
      }
    } catch (error) {
      logger.error({ err: error, appId }, "[Games] Steam scraper also failed");
    }

    return null;
  }
}

export const gameScoreService = new GameScoreService();
