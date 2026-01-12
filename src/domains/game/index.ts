import { FastifyPluginAsync } from "fastify";
import { infoRoutes } from "./routes/info.js";

export const gameDomain: FastifyPluginAsync = async (fastify) => {
  await fastify.register(infoRoutes, { prefix: "/game" });
};
