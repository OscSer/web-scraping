import { FastifyPluginAsync } from "fastify";
import { infoRoutes } from "./routes/info.js";
import { createGameInfoService } from "./services/game-info-service.js";

export const gameDomain: FastifyPluginAsync = async (fastify) => {
  const domainLogger = fastify.log.child({}, { msgPrefix: "[Game] " });
  const gameInfoService = createGameInfoService(domainLogger);

  await fastify.register(infoRoutes, {
    prefix: "/game",
    gameInfoService,
  });
};
