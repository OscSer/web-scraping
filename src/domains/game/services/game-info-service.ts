import { GameInfo } from "../types/game.js";
import { steamUnifiedApiClient } from "./steam-unified-api-client.js";

class GameInfoService {
  async getGameInfoByAppId(appId: string): Promise<GameInfo> {
    const gameData = await steamUnifiedApiClient.getGameData(appId);

    return {
      score: gameData.score,
      name: gameData.name,
      source: "steam",
    };
  }
}

export const gameInfoService = new GameInfoService();
