import { FastifyPluginAsync, FastifyReply } from "fastify";
import { triiClient } from "../services/trii-client.js";
import { TickerData, ApiResponse } from "../types/index.js";

interface TickerParams {
  ticker: string;
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

function normalizeTicker(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.toLowerCase();
}

export const tickerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: TickerParams }>(
    "/ticker/:ticker",
    async (request, reply) => {
      const { ticker } = request.params;

      const normalizedTicker = normalizeTicker(ticker);
      if (!normalizedTicker) {
        await sendError(reply, 400, "INVALID_TICKER", "Ticker is required");
        return;
      }

      try {
        const price = await triiClient.getPriceByTicker(normalizedTicker);
        if (price === null) {
          await sendError(
            reply,
            404,
            "TICKER_NOT_FOUND",
            `Ticker "${normalizedTicker}" not found`,
          );
          return;
        }

        const response: ApiResponse<TickerData> = {
          success: true,
          data: { price },
        };

        return reply.code(200).send(response);
      } catch (error) {
        fastify.log.error({ err: error }, "[API] Error fetching ticker");
        await sendError(
          reply,
          502,
          "FETCH_ERROR",
          "Error fetching ticker price",
        );
      }
    },
  );
};
