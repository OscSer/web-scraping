import { FastifyPluginAsync } from "fastify";
import { rankingRoutes } from "./routes/ranking.js";
import { ArtificialAnalysisClient } from "./services/artificial-analysis-client.js";
import { ModelRankingService } from "./services/model-ranking-service.js";

export const aiDomain: FastifyPluginAsync = async (fastify) => {
  const domainLogger = fastify.log.child({}, { msgPrefix: "[AI] " });
  const artificialAnalysisClient = new ArtificialAnalysisClient(domainLogger);
  const modelRankingService = new ModelRankingService(artificialAnalysisClient);

  await fastify.register(rankingRoutes, {
    prefix: "/ai",
    modelRankingService,
  });
};
