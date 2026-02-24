import { FastifyPluginAsync } from "fastify";
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

    let hadProviderError = false;
    let result: TickerData | null = null;

    try {
      result = await triiClient.getPriceByTicker(normalizedTicker);
    } catch (error) {
      hadProviderError = true;
      fastify.log.error({ err: error }, "Error fetching ticker from Trii");
      fastify.log.info({ ticker: normalizedTicker }, "Trii failed, trying TradingView as fallback");
    }

    if (result !== null) {
      return reply.code(200).send(result);
    }

    if (!hadProviderError) {
      fastify.log.info(
        { ticker: normalizedTicker },
        "Ticker not found in Trii, trying TradingView",
      );
    }

    try {
      result = await tradingViewClient.getPriceByTicker(normalizedTicker);
    } catch (error) {
      hadProviderError = true;
      fastify.log.error({ err: error }, "Error fetching ticker from TradingView");
    }

    if (result !== null) {
      return reply.code(200).send(result);
    }

    if (!hadProviderError) {
      await sendError(reply, 404, "TICKER_NOT_FOUND", `Ticker "${normalizedTicker}" not found`);
      return;
    }

    await sendError(reply, 502, "FETCH_ERROR", "Error fetching ticker price");
  });
};
