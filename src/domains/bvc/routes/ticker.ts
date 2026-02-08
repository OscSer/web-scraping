import { FastifyPluginAsync } from "fastify";
import { ApiResponse } from "../../../shared/types/api.js";
import { sendError } from "../../../shared/utils/api-helpers.js";
import { normalizeTicker } from "../../../shared/utils/string-helpers.js";
import { TradingViewClient } from "../services/tradingview-client.js";
import { TriiClient } from "../services/trii-client.js";
import { TickerData } from "../types/ticker.js";

interface TickerParams {
  ticker: string;
}

interface TickerRoutesOptions {
  triiClient: TriiClient;
  tradingViewClient: TradingViewClient;
}

export const tickerRoutes: FastifyPluginAsync<TickerRoutesOptions> = async (fastify, opts) => {
  const { triiClient, tradingViewClient } = opts;

  fastify.get<{ Params: TickerParams }>("/ticker/:ticker", async (request, reply) => {
    const { ticker } = request.params;

    const normalizedTicker = normalizeTicker(ticker);
    if (!normalizedTicker) {
      await sendError(reply, 400, "INVALID_TICKER", "Ticker is required");
      return;
    }

    try {
      let result: TickerData | null = await triiClient.getPriceByTicker(normalizedTicker);

      if (result === null) {
        fastify.log.info(
          { ticker: normalizedTicker },
          "Ticker not found in Trii, trying TradingView",
        );
        result = await tradingViewClient.getPriceByTicker(normalizedTicker);
      }

      if (result === null) {
        await sendError(reply, 404, "TICKER_NOT_FOUND", `Ticker "${normalizedTicker}" not found`);
        return;
      }

      const response: ApiResponse<TickerData> = {
        success: true,
        data: result,
      };

      return reply.code(200).send(response);
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching ticker");

      fastify.log.info({ ticker: normalizedTicker }, "Trii failed, trying TradingView as fallback");

      try {
        const result = await tradingViewClient.getPriceByTicker(normalizedTicker);

        if (result !== null) {
          const response: ApiResponse<TickerData> = {
            success: true,
            data: result,
          };
          return reply.code(200).send(response);
        }
      } catch (fallbackError) {
        fastify.log.error({ err: fallbackError }, "TradingView fallback also failed");
      }

      await sendError(reply, 502, "FETCH_ERROR", "Error fetching ticker price");
    }
  });
};
