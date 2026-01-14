import type { FastifyBaseLogger } from "fastify";
import { GameInfo } from "../types/game.js";
import { createSteamUnifiedApiClient } from "./steam-unified-api-client.js";

export class GameInfoService {
  private steamUnifiedApiClient;

  constructor(logger: FastifyBaseLogger) {
    this.steamUnifiedApiClient = createSteamUnifiedApiClient(logger);
  }

  async getGameInfoByAppId(appId: string): Promise<GameInfo> {
    const gameData = await this.steamUnifiedApiClient.getGameData(appId);

    return {
      score: gameData.score,
      name: gameData.name,
      source: "steam",
    };
  }
}

export function createGameInfoService(logger: FastifyBaseLogger) {
  return new GameInfoService(logger);
}
