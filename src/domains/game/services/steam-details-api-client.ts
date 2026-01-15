import type { FastifyBaseLogger } from "fastify";
import { SteamFetchError, SteamParseError } from "../types/errors.js";
import { globalRateLimiter } from "../../../shared/utils/global-rate-limiter.js";
import { USER_AGENT } from "../../../shared/config/index.js";
import { handleSteamError } from "../utils/steam-error-handler.js";

const GAME_NAME_PLACEHOLDER = "Unknown Game";

interface SteamAppDetailsResponse {
  [appId: string]: {
    success: boolean;
    data?: {
      name?: string;
    };
  };
}

export class SteamDetailsApiClient {
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
  }

  async getGameNameByAppId(appId: string): Promise<string> {
    try {
      const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;

      const response = await globalRateLimiter(() =>
        fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
            "Accept-Language": "en-US,en;q=0.5",
          },
        }),
      );

      if (!response.ok) {
        throw new SteamFetchError(
          `Failed to fetch Steam app details for app ${appId}`,
          response.status,
          response.statusText,
        );
      }

      const data = (await response.json()) as SteamAppDetailsResponse;

      const appData = data[appId];
      if (!appData) {
        throw new SteamParseError(
          `Steam API returned no data for app ${appId}`,
        );
      }

      if (!appData.success || !appData.data) {
        throw new SteamParseError(
          `Steam API returned success=false for app ${appId}`,
        );
      }

      const gameName = appData.data.name;
      if (!gameName || typeof gameName !== "string") {
        throw new SteamParseError(
          `Steam API returned invalid name for app ${appId}`,
        );
      }

      return gameName;
    } catch (error) {
      return handleSteamError(
        this.logger,
        error,
        appId,
        "game name from Steam Details API",
        GAME_NAME_PLACEHOLDER,
      );
    }
  }
}
