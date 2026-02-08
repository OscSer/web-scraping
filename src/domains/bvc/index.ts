import { FastifyPluginAsync } from "fastify";
import { tickerRoutes } from "./routes/ticker.js";
import { TradingViewClient } from "./services/tradingview-client.js";
import { TriiClient } from "./services/trii-client.js";

export const bvcDomain: FastifyPluginAsync = async (fastify) => {
  const domainLogger = fastify.log.child({}, { msgPrefix: "[BVC] " });
  const triiClient = new TriiClient(domainLogger);
  const tradingViewClient = new TradingViewClient(domainLogger);

  await fastify.register(tickerRoutes, {
    prefix: "/bvc",
    triiClient,
    tradingViewClient,
  });
};
