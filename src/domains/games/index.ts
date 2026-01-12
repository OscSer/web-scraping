import { FastifyPluginAsync } from "fastify";
import { scoreRoutes } from "./routes/score.js";

export const gamesDomain: FastifyPluginAsync = async (fastify) => {
  await fastify.register(scoreRoutes, { prefix: "/games" });
};
