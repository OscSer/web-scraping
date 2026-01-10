import { FastifyPluginAsync, FastifyReply } from "fastify";
import { bvcClient } from "../services/bvc-client.js";
import { InMemoryCache } from "../utils/cache.js";
import { config } from "../config/index.js";
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
  const tickerCache = new InMemoryCache<TickerData>(
    config.cache.ttlSeconds * 1000,
  );

  fastify.addHook("onClose", async () => {
    tickerCache.clear();
  });

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
        const cachedData = await tickerCache.getOrFetch(
          normalizedTicker,
          async () => {
            const requestIp = request.ip || null;

            const tickerData = await bvcClient.getTickerData(normalizedTicker, {
              requestIp,
            });
            if (tickerData === null) {
              throw new Error("TICKER_NOT_FOUND");
            }
            return tickerData;
          },
        );

        const response: ApiResponse<TickerData> = {
          success: true,
          data: cachedData,
        };

        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof Error && error.message === "TICKER_NOT_FOUND") {
          await sendError(
            reply,
            404,
            "TICKER_NOT_FOUND",
            `Ticker "${normalizedTicker}" not found in the Colombian Global Market`,
          );
          return;
        }

        fastify.log.error({ err: error }, "[API] Error fetching ticker");
        await sendError(reply, 502, "BVC_API_ERROR", "Error querying BVC API");
      }
    },
  );
};
