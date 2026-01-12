import { FastifyPluginAsync } from "fastify";
import { tickerRoutes } from "./routes/ticker.js";

export const bvcDomain: FastifyPluginAsync = async (fastify) => {
  await fastify.register(tickerRoutes, { prefix: "/bvc" });
};
