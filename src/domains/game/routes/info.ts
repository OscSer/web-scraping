import { FastifyPluginAsync, FastifyReply } from "fastify";
import { ApiResponse } from "../../../shared/types/api.js";
import { GameScore } from "../types/game.js";
import { extractAppId } from "../services/steam-url-parser.js";
import { gameScoreService } from "../services/game-score-service.js";

interface InfoQueryString {
  url: string;
}

function createErrorResponse(
  code: string,
  message: string,
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message },
  };
}

async function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
): Promise<void> {
  await reply.code(statusCode).send(createErrorResponse(code, message));
}

export const infoRoutes: FastifyPluginAsync = async (fastify) => {
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

      fastify.log.info({ appId, url }, "[Game] Fetching game info");

      try {
        const gameInfo = await gameScoreService.getScoreByAppId(appId);

        if (!gameInfo) {
          await sendError(
            reply,
            404,
            "GAME_NOT_FOUND",
            `Game with App ID "${appId}" not found or has no reviews`,
          );
          return;
        }

        const response: ApiResponse<GameScore> = {
          success: true,
          data: gameInfo,
        };

        await reply.code(200).send(response);
      } catch (error) {
        fastify.log.error(
          { err: error, appId },
          "[Game] Error fetching game info",
        );

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
