import { FastifyPluginAsync, FastifyReply } from "fastify";
import { ApiResponse } from "../../../shared/types/api.js";
import { GameScore } from "../types/game.js";
import { extractAppId } from "../services/steam-url-parser.js";
import { gameScoreService } from "../services/game-score-service.js";

interface ScoreQueryString {
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

export const scoreRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: ScoreQueryString }>(
    "/score",
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

      fastify.log.info({ appId, url }, "[Games] Fetching game score");

      try {
        const score = await gameScoreService.getScoreByAppId(appId);

        if (!score) {
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
          data: score,
        };

        await reply.code(200).send(response);
      } catch (error) {
        fastify.log.error(
          { err: error, appId },
          "[Games] Error fetching score",
        );

        await sendError(
          reply,
          502,
          "SCRAPING_ERROR",
          "Unable to fetch game score",
        );
      }
    },
  );
};
