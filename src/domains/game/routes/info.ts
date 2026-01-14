import { FastifyPluginAsync } from "fastify";
import { ApiResponse } from "../../../shared/types/api.js";
import { GameInfo } from "../types/game.js";
import { extractAppId } from "../services/steam-url-parser.js";
import { GameInfoService } from "../services/game-info-service.js";
import { sendError } from "../../../shared/utils/api-helpers.js";

interface InfoQueryString {
  url: string;
}

interface InfoRoutesOptions {
  gameInfoService: GameInfoService;
}

export const infoRoutes: FastifyPluginAsync<InfoRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { gameInfoService } = opts;

  fastify.get<{ Querystring: InfoQueryString }>(
    "/info",
    async (request, reply) => {
      const { url } = request.query;

      if (!url || typeof url !== "string") {
        await sendError(reply, 400, "INVALID_URL", "URL parameter is required");
        return;
      }

      const appId = extractAppId(url);
      if (!appId) {
        await sendError(
          reply,
          400,
          "INVALID_URL",
          "Invalid Steam URL or App ID",
        );
        return;
      }

      fastify.log.info({ appId, url }, "Fetching game info");

      try {
        const gameInfo = await gameInfoService.getGameInfoByAppId(appId);

        const response: ApiResponse<GameInfo> = {
          success: true,
          data: gameInfo,
        };

        await reply.code(200).send(response);
      } catch (error) {
        fastify.log.error({ err: error, appId }, "Error fetching game info");

        await sendError(
          reply,
          502,
          "SCRAPING_ERROR",
          "Unable to fetch game info",
        );
      }
    },
  );
};
